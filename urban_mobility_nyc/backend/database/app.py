from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import mysql.connector 
from mysql.connector import Error
import os
from datetime import datetime, timedelta
import random

app = Flask(__name__)
CORS(app)

db_config = {
    'host': '127.0.0.1',
    'user': 'root',
    'password': os.environ.get('DB_PASSWORD', 'N0000@20'),
    'database': 'nyc_mobility_db'
}

def get_db_connection():
    try:
        return mysql.connector.connect(**db_config)
    except Error as e:
        print(f"Database Connection Error: {e}")
        return None

@app.route('/api/borough-stats', methods=['GET'])
def get_borough_stats():
    """Fetches pre calculated stats from our database view."""
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Link Down"}), 500

    cursor = conn.cursor(dictionary=True)
    query = "SELECT * FROM borough_performance_summary ORDER BY trip_count DESC;"
    cursor.execute(query)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/hourly-trends', methods=['GET'])
def get_hourly_trends():
    """Returns trip by hour, optimized by idx_pickup_hour."""
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Link Down"}), 500

    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT
        pickup_hour,
        COUNT(*) as trip_count,
        ROUND(AVG(speed_mph), 2) as avg_speed,
        ROUND(AVG(fare_amount), 2) as avg_fare
    FROM trips
    GROUP BY pickup_hour
    ORDER BY pickup_hour;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/map-data', methods=['GET'])
def get_map_data():
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Link Down"}), 500

    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT
        pu_location_id as location_id,
        COUNT(*) as trip_count
    FROM trips
    GROUP BY pu_location_id;
    """
    cursor.execute(query)
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)


@app.route('/')
def home():
    """Serve the HTML file"""
    return send_from_directory('../frontend', 'index.html')

@app.route('/api/dashboard-summary', methods=['GET'])
def get_dashboard_summary():
    """Get summary stats for dashboard cards"""
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Link Down"}), 500

    cursor = conn.cursor(dictionary=True)
    
    # Today's date for filters
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)
    
    queries = {
        'total_trips': "SELECT COUNT(*) as value FROM trips",
        'avg_fare': "SELECT ROUND(AVG(fare_amount), 2) as value FROM trips",
        'avg_distance': "SELECT ROUND(AVG(trip_distance), 2) as value FROM trips",
        'active_zones': "SELECT COUNT(DISTINCT pu_location_id) as value FROM trips",
        'peak_hour': """
            SELECT pickup_hour as value, COUNT(*) as count 
            FROM trips 
            GROUP BY pickup_hour 
            ORDER BY count DESC 
            LIMIT 1
        """,
        'total_revenue': "SELECT ROUND(SUM(total_amount), 2) as value FROM trips"
    }
    
    result = {}
    for key, query in queries.items():
        cursor.execute(query)
        row = cursor.fetchone()
        if key == 'peak_hour':
            result[key] = row['value'] if row else 0
        else:
            result[key] = row['value'] if row else 0
    
    cursor.close()
    conn.close()
    return jsonify(result)

@app.route('/api/top-routes', methods=['GET'])
def get_top_routes():
    """Get most popular pickup-dropoff routes"""
    limit = request.args.get('limit', 6, type=int)
    
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Link Down"}), 500

    cursor = conn.cursor(dictionary=True)
    query = """
    SELECT 
        pu_location_id,
        do_location_id,
        COUNT(*) as trip_count,
        ROUND(AVG(fare_amount), 2) as avg_fare,
        ROUND(AVG(trip_distance), 2) as avg_distance
    FROM trips
    GROUP BY pu_location_id, do_location_id
    ORDER BY trip_count DESC
    LIMIT %s;
    """
    cursor.execute(query, (limit,))
    data = cursor.fetchall()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/search', methods=['GET'])
def search_data():
    """Search for zones or trips"""
    query = request.args.get('q', '').strip()
    if len(query) < 2:
        return jsonify([])
    
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Link Down"}), 500

    cursor = conn.cursor(dictionary=True)
    
    # Search zones
    cursor.execute("""
        SELECT 
            location_id as id,
            zone_name as name,
            borough,
            'zone' as type
        FROM zones
        WHERE zone_name LIKE %s OR borough LIKE %s
        LIMIT 10
    """, (f'%{query}%', f'%{query}%'))
    
    results = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(results)

@app.route('/api/random-insight', methods=['GET'])
def get_random_insight():
    """Return a random interesting fact"""
    conn = get_db_connection()
    if not conn: return jsonify({"error": "DB Link Down"}), 500

    cursor = conn.cursor(dictionary=True)
    
    insights = [
        {
            'title': 'Busiest Hour',
            'query': "SELECT pickup_hour, COUNT(*) as count FROM trips GROUP BY pickup_hour ORDER BY count DESC LIMIT 1"
        },
        {
            'title': 'Most Popular Zone',
            'query': """
                SELECT z.zone_name, COUNT(*) as count 
                FROM trips t 
                JOIN zones z ON t.pu_location_id = z.location_id 
                GROUP BY z.zone_name
                ORDER BY count DESC LIMIT 1
            """
        },
        {
            'title': 'Average Tip Percentage',
            'query': "SELECT ROUND(AVG(tip_amount/fare_amount * 100), 1) as value FROM trips WHERE fare_amount > 0"
        },
        {
            'title': 'Longest Average Trip',
            'query': "SELECT z.zone_name, ROUND(AVG(trip_distance), 1) as avg_dist FROM trips t JOIN zones z ON t.pu_location_id = z.location_id GROUP BY z.zone_name ORDER BY avg_dist DESC LIMIT 1"
        }
    ]
    
    insight = random.choice(insights)
    cursor.execute(insight['query'])
    result = cursor.fetchone()
    
    cursor.close()
    conn.close()
    
    return jsonify({
        'title': insight['title'],
        'data': result
    })

#  HEALTH CHECK

@app.route('/api/health', methods=['GET'])
def health_check():
    """Check if API and database are working"""
    conn = get_db_connection()
    db_status = 'connected' if conn else 'disconnected'
    if conn:
        conn.close()
    
    return jsonify({
        'status': 'active',
        'timestamp': datetime.now().isoformat(),
        'database': db_status,
        'endpoints': [
            '/api/dashboard-summary',
            '/api/borough-stats',
            '/api/hourly-trends',
            '/api/map-data',
            '/api/top-routes',
            '/api/zone-insights/<id>',
            '/api/search',
            '/api/random-insight'
        ]
    })

if __name__ == '__main__':
    print("=" * 50)
    print("NYC MOBILITY API SERVER")
    print("=" * 50)
    print(" Server starting...")
    print(f"Port: 5000")
    print(f" Database: {db_config['database']}")
    print("=" * 50)
    print("Endpoints available:")
    print("   - /api/dashboard-summary")
    print("   - /api/borough-stats")
    print("   - /api/hourly-trends")
    print("   - /api/map-data")
    print("   - /api/top-routes")
    print("   - /api/zone-insights/<id>")
    print("   - /api/search")
    print("   - /api/random-insight")
    print("   - /api/health")
    print("=" * 50)
    app.run(debug=True, port=5000)
-- 1. Wipe the slate clean
DROP DATABASE IF EXISTS nyc_mobility_db;
CREATE DATABASE nyc_mobility_db;
USE nyc_mobility_db;

-- 2. Create the Zones table (The "Parent")
CREATE TABLE zones (
    location_id INT PRIMARY KEY,
    borough VARCHAR(100),
    zone_name VARCHAR(200),
    service_zone VARCHAR(100)
);

-- 3. Create the Trips table 
CREATE TABLE trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id VARCHAR(10),
    pickup_datetime DATETIME,
    dropoff_datetime DATETIME,
    passenger_count INT,
    trip_distance DECIMAL(12,2),
    pu_location_id INT,
    do_location_id INT,
    fare_amount DECIMAL(12,2),
    tip_amount DECIMAL(12,2),
    total_amount DECIMAL(12,2),
    payment_type INT,
    duration_min DECIMAL(12,2),
    fare_per_mile DECIMAL(12,2),
    pickup_hour INT,
    pickup_dayofweek INT,
    is_weekend INT,
    speed_mph DECIMAL(12,2),
    tip_pct DECIMAL(12,2),
    pickup_month INT,
    pickup_year INT,
    fare_per_min DECIMAL(12,2),
    FOREIGN KEY (pu_location_id) REFERENCES zones(location_id)
);

-- creation of indexes for speed up
CREATE INDEX idx_pu_location ON trips(pu_location_id);
CREATE INDEX idx_do_location_id ON trips(do_location_id);
CREATE INDEX idx_pickup_hour ON trips(pickup_hour);

CREATE OR REPLACE VIEW borough_performance_summary AS
SELECT 
    z.borough, 
    COUNT(t.id) as trip_count, 
    ROUND(AVG(t.speed_mph), 2) as avg_speed,
    ROUND(AVG(t.fare_amount), 2) as avg_fare,
    ROUND(SUM(t.total_amount), 2) as total_revenue
FROM trips t
JOIN zones z ON t.pu_location_id = z.location_id
WHERE z.borough NOT IN ('EWR', 'Unknown')
    AND z.borough IS NOT NULL
GROUP BY z.borough;
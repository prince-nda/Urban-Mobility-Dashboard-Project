import pandas as pd
from sqlalchemy import create_engine

engine = create_engine("mysql+mysqlconnector://root:N0000@20@l127.0.0.1/nyc_mobility_db")

def load_all_data():
    mapping = {
        'VendorID': 'vendor_id',
        'tpep_pickup_datetime': 'pickup_datetime',
        'tpep_dropoff_datetime': 'dropoff_datetime',
        'passenger_count': 'passenger_count',
        'trip_distance': 'trip_distance',
        'PULocationID': 'pu_location_id',
        'DOLocationID': 'do_location_id',
        'payment_type': 'payment_type',
        'fare_amount': 'fare_amount',
        'tip_amount': 'tip_amount',
        'total_amount': 'total_amount',
        'duration_min': 'duration_min',
        'fare_per_mile': 'fare_per_mile',
        'pickup_hour': 'pickup_hour',
        'pickup_dayofweek': 'pickup_dayofweek',
        'is_weekend': 'is_weekend',
        'speed_mph': 'speed_mph',
        'tip_pct': 'tip_pct',
        'fare_per_min': 'fare_per_min'
    }

    for i, chunk in enumerate(pd.read_csv('final_cleaned_data.csv', chunksize=100000)):
        # 1. Cleaning Outliers & Formatting
        chunk['tpep_pickup_datetime'] = pd.to_datetime(chunk['tpep_pickup_datetime'])
        chunk['pickup_month'] = chunk['tpep_pickup_datetime'].dt.month
        chunk['pickup_year'] = chunk['tpep_pickup_datetime'].dt.year
        
        # 2. Fix the "Out of Range" issues from before
        chunk['tip_pct'] = chunk['tip_pct'].fillna(0).clip(upper=1000)
        chunk['speed_mph'] = chunk['speed_mph'].fillna(0).clip(upper=200)
        
        # 3. Rename and Filter
        chunk = chunk.rename(columns=mapping)
        final_cols = list(mapping.values()) + ['pickup_month', 'pickup_year']
        chunk = chunk[final_cols]
        
        # 4. Upload
        chunk.to_sql('trips', con=engine, if_exists='append', index=False)
        print(f"Progress: {(i+1)*100000:,} rows uploaded")

if __name__ == "__main__":
    load_all_data()
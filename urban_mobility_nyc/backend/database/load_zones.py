import pandas as pd
from sqlalchemy import create_engine

engine = create_engine("mysql+mysqlconnector://root:N0000@20@127.0.0.1/nyc_mobility_db")

# Load lookup file
zones_df = pd.read_csv('taxi_zone_lookup.csv')
zones_df.columns = ['location_id', 'borough', 'zone_name', 'service_zone']

# Add safety IDs 264/265 
for extra_id in [264, 265]:
    if extra_id not in zones_df['location_id'].values:
        zones_df = pd.concat([zones_df, pd.DataFrame([{'location_id': extra_id, 'borough': 'Unknown', 'zone_name': 'Unknown', 'service_zone': 'N/A'}])])

zones_df.to_sql('zones', con=engine, if_exists='append', index=False)
print("Zones table is ready!")
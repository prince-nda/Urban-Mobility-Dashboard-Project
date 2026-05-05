import geopandas as gpd
import os

def convert_taxi_zones(input_shp, output_geojson):
    # Check if the input file exists
    if not os.path.exists(input_shp):
        print(f"Error: {input_shp} not found. Make sure the .shp, .shx, and .dbf files are in this folder.")
        return

    print(f"Reading {input_shp}...")
    
    #This handles all the associated files (.dbf, .shx)
    gdf = gpd.read_file(input_shp)

    
    # This converts the coordinates to Latitude/Longitude for the web
    print("Re-projecting to WGS84 (EPSG:4326)...")
    gdf = gdf.to_crs(epsg=4326)

    # Clean column names (make them lowercase)
    gdf.columns = [col.lower() for col in gdf.columns]

    # Save to GeoJSON
    print(f"Saving to {output_geojson}...")
    gdf.to_file(output_geojson, driver='GeoJSON')

    print(f"Success! Converted {len(gdf)} zones.")
    print(f"Preview of data:\n{gdf[['location_id', 'borough', 'zone']].head()}")

if __name__ == "__main__":
    convert_taxi_zones("taxi_zones.shp", "taxi_zones.geojson")
CREATE DATABASE IF NOT EXISTS nyc_mobility_db;
USE nyc_mobility_db;

DROP TABLE IF EXISTS zones
DROP TABLE IF EXISTS trips

-- Create zones table
CREATE TABLE IF NOT EXISTS zones (
    location_id INT PRIMARY KEY,
    borough VARCHAR(100),
    zone_name VARCHAR(200),
    service_zone VARCHAR(100)
);

-- Create trips table - MATCHING YOUR FINAL CLEANED DATA
CREATE TABLE IF NOT EXISTS trips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    VendorID VARCHAR(10),
    tpep_pickup_datetime DATETIME,
    tpep_dropoff_datetime DATETIME,
    passenger_count INT,
    trip_distance DECIMAL(10,2),
    RatecodeID INT,
    store_and_fwd_flag VARCHAR(10),
    PULocationID INT,
    DOLocationID INT,
    payment_type INT,
    fare_amount DECIMAL(10,2),
    extra DECIMAL(10,2),
    mta_tax DECIMAL(10,2),
    tip_amount DECIMAL(10,2),
    tolls_amount DECIMAL(10,2),
    improvement_surcharge DECIMAL(10,2),
    total_amount DECIMAL(10,2),
    congestion_surcharge DECIMAL(10,2),
    pickup_borough VARCHAR(100),
    pickup_zone VARCHAR(200),
    dropoff_borough VARCHAR(100),
    dropoff_zone VARCHAR(200),
    duration_min DECIMAL(10,2),
    fare_per_mile DECIMAL(10,2),
    pickup_hour INT,
    pickup_dayofweek INT,
    is_weekend INT,
    speed_mph DECIMAL(10,2),
    tip_pct DECIMAL(5,2),
    fare_per_min DECIMAL(10,2),
    FOREIGN KEY (PULocationID) REFERENCES zones(location_id),
    FOREIGN KEY (DOLocationID) REFERENCES zones(location_id)
);

-- Show tables
SHOW TABLES;
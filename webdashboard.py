import os
import json
import boto3
import psycopg2
from datetime import datetime, time

# Global variable to cache the database connection
db_connection = None



def get_db_connection():
    global db_connection
    if db_connection and db_connection.status == psycopg2.extensions.STATUS_READY:
        return db_connection

    try:
        print("Connecting to database using Environment Variables...")
        db_connection = psycopg2.connect(
            host=os.environ.get('DB_HOST'),
            port=5432,
            database=os.environ.get('DB_NAME'),
            user=os.environ.get('DB_USER'),
            password=os.environ.get('DB_PASSWORD')
        )
        print("Database connection successful.")
        return db_connection
    except Exception as e:
        print(f"ERROR: Could not connect to the database: {e}")
        raise e



def validate_origin(headers):
    """
    Checks if the request origin is allowed.
    Returns (is_allowed, origin_to_return)
    """
    if not headers:
        return False, ""

    # Get origin safely (handle lower-case or capitalized keys)
    origin = headers.get('origin') or headers.get('Origin') or ""
    
    # 1. Allow Localhost
    if origin == "http://localhost:3000":
        return True, origin
        
    # 2. Allow climmatech.com and any subdomains (e.g., app.climmatech.com)
    # This check ensures it matches the domain OR ends with .climmatech.com
    if origin == "https://climmatech.com" or origin.endswith(".climmatech.com"):
        return True, origin

    # Default: Deny
    print(f"Blocked request from unauthorized origin: {origin}")
    return True, origin

def lambda_handler(event, context):
    """
    Main Lambda handler to query telemetry data with Strict CORS security.
    """
    try:
        # --- 1. Security & CORS Check ---
        headers = event.get('headers') or {}
        is_allowed, request_origin = validate_origin(headers)
        
        # Prepare headers for response (only return the specific allowed origin, not *)
        response_headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        }

        if is_allowed:
            response_headers["Access-Control-Allow-Origin"] = request_origin
        else:
            # If origin is not allowed, we don't even return CORS headers for it,
            # or we can return specific headers. Usually, we just 403.
            return {
                "statusCode": 403,
                "headers": response_headers,
                "body": json.dumps({"message": "Forbidden: unauthorized origin"})
            }

        # Handle CORS preflight (OPTIONS)
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": response_headers,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        print(f"Received valid request from: {request_origin}")

        # --- 2. Input Parsing and Validation ---
        params = event.get('queryStringParameters') or {} # Default to empty dict if None
        device_id = params.get('device_id')
        metric = params.get('metric')
        start_date_str = params.get('start_date')
        end_date_str = params.get('end_date')
        start_time_str = params.get('start_time')
        end_time_str = params.get('end_time')

        if not all([device_id, metric, start_date_str, end_date_str]):
            return {
                "statusCode": 400,
                "headers": response_headers,
                "body": json.dumps("Missing required parameters: device_id, metric, start_date, end_date")
            }

        # --- 3. Validate metric mapping ---
        allowed_metrics = {
            'temperature': {'table': 'telemetry_temperature', 'column': 'temperature'},
            'battery': {'table': 'telemetry_battery', 'column': 'battery'},
            'depth': {'table': 'telemetry_depth', 'column': 'depth'},
            'velocity_radar': {'table': 'telemetry_velocity_radar', 'column': 'mean_velocity, section_velocity'},
            'velocity_video': {'table': 'telemetry_velocity_video', 'column': 'mean_velocity, section_velocity'},
            'river_flow': {'table': 'telemetry_river_flow', 'column': 'flow_litres'},
            'discharge': {'table': 'telemetry_discharge', 'column': 'discharge'}
        }

        if metric not in allowed_metrics:
            return {
                "statusCode": 400,
                "headers": response_headers,
                "body": json.dumps(f"Invalid metric specified. Allowed values: {list(allowed_metrics.keys())}")
            }

        table_name = allowed_metrics[metric]['table']
        column_names = allowed_metrics[metric]['column']

        # --- 4. Build query ---
        query_params = [device_id]
        sql = f"SELECT timestamp, {column_names} FROM {table_name} WHERE device_id = %s"
        sql += " AND timestamp >= %s AND timestamp < (%s::date + interval '1 day')"
        query_params.extend([start_date_str, end_date_str])

        if start_time_str and end_time_str:
            sql += " AND timestamp::time >= %s AND timestamp::time <= %s"
            query_params.extend([start_time_str, end_time_str])

        sql += " ORDER BY timestamp DESC;"

        print(f"Executing query: {sql}")

        # --- 5. Execute query ---
        results = []
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute(sql, tuple(query_params))
            rows = cur.fetchall()
            colnames = [desc[0] for desc in cur.description]
            for row in rows:
                results.append(dict(zip(colnames, row)))
        conn.commit()

        print(f"Query returned {len(results)} rows.")

        return {
            "statusCode": 200,
            "headers": response_headers, # Include the authorized CORS headers
            "body": json.dumps(results, default=str)
        }

    except Exception as e:
        print(f"ERROR: {e}")
        if db_connection:
            db_connection.rollback()
        return {
            "statusCode": 500,
            # We must define headers here too in case of error, 
            # otherwise the frontend can't read the error message
            "headers": { 
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*", # Fallback for 500 errors or use logic above
                "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
            },
            "body": json.dumps("An internal server error occurred.")
        }
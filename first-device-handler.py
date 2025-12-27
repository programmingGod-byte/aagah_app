import json
import base64
from datetime import datetime
import boto3
from psycopg2 import pool   # ✅ correct import

# 1️⃣ DynamoDB setup
dynamodb = boto3.resource('dynamodb')
device_table = dynamodb.Table('visiflow-devices')
user_table = dynamodb.Table('visiflow-users')
# 2️⃣ PostgreSQL connection pool
DB_POOL = pool.SimpleConnectionPool(
    minconn=1,
    maxconn=10,
    host="visiflow-timescale-testing.ct8icwyys1i9.ap-south-1.rds.amazonaws.com",
    port=5432,
    database="visiflow",
    user="postgres",
    password="shivampranab"
)


def insert_telemetry(data):
    """
    Inserts telemetry data using a pooled connection.
    It now expects a datetime object for the timestamp.
    """
    conn = None
    try:
        conn = DB_POOL.getconn()
        cur = conn.cursor()
        device_id = data["device_id"]
        
        # --- ✅ KEY CHANGE HERE ---
        # Use the datetime object passed directly from the handler.
        # Fallback to now() if it's somehow missing.
        timestamp = data.get("timestamp_obj", datetime.utcnow())

        # --- Your INSERT logic (unchanged) ---
        print(data)
        if "battery_level" in data:
            cur.execute("INSERT INTO telemetry_battery (device_id, timestamp, battery) VALUES (%s, %s, %s)",
                        (device_id, timestamp, data["battery_level"]))
        if "depth" in data:
            cur.execute("INSERT INTO telemetry_depth (device_id, timestamp, depth) VALUES (%s, %s, %s)",
                        (device_id, timestamp, data["depth"]))
        # ... (include all your other 'if' blocks for inserts here) ...
        if "mean_velocity" in data and "velocity" in data:
            cur.execute("INSERT INTO telemetry_velocity_radar (device_id, timestamp, mean_velocity, section_velocity) VALUES (%s, %s, %s, %s)",
                        (device_id, timestamp, data["mean_velocity"], data["velocity"]))
        if "video_mean_velocity" in data and "video_velocity" in data:
            cur.execute("INSERT INTO telemetry_velocity_video (device_id, timestamp, mean_velocity, section_velocity) VALUES (%s, %s, %s, %s)",
                        (device_id, timestamp, data["video_mean_velocity"], data["video_velocity"]))
        if "flow_in_litres" in data:
            cur.execute("INSERT INTO telemetry_river_flow (device_id, timestamp, flow_litres) VALUES (%s, %s, %s)",
                        (device_id, timestamp, data["flow_in_litres"]))
        if "width" in data:
            cur.execute("INSERT INTO telemetry_width (device_id, timestamp, width) VALUES (%s, %s, %s)",
                        (device_id, timestamp, data["width"]))
        if "discharge" in data:
            cur.execute("INSERT INTO telemetry_discharge  (device_id, timestamp, discharge) VALUES (%s, %s, %s)",
                        (device_id, timestamp, data["discharge"]))
        if "flow_angle" in data:
            cur.execute("INSERT INTO telemetry_flow_angle  (device_id, timestamp, flow_angle) VALUES (%s, %s, %s)",
                        (device_id, timestamp, data["flow_angle"]))                        
        if "temperature" in data:
            cur.execute("INSERT INTO telemetry_temperature  (device_id, timestamp, temperature) VALUES (%s, %s, %s)",
                        (device_id, timestamp, data["temperature"]))                        
        
        conn.commit()
        cur.close()
        return True

    except Exception as e:
        print(f"❌ DB insert error for device {data.get('device_id')}: {e}")
        if conn:
            conn.rollback()
        return False

    finally:
        if conn:
            DB_POOL.putconn(conn)

# 3️⃣ Corrected Lambda handler
def lambda_handler(event, context):
    output_records = []

    for record in event['records']:
        try:
            payload_decoded = base64.b64decode(record['data']).decode('utf-8')
            data = json.loads(payload_decoded)
            device_id = data.get('device_id')
            print(device_id)

            # --- Step 1: Validate the device ID ---
            is_valid_device = True
            if device_id:
                response = device_table.get_item(Key={'device_id': device_id})
                if 'Item' in response:
                    is_valid_device = True
            
            if not is_valid_device:
                raise ValueError(f"Device validation failed for device_id: {device_id}")

            # --- Step 2: Determine a single, consistent timestamp for the event ---
            timestamp_str = data.get("timestamp")
            if timestamp_str:
                try:
                    event_time = datetime.strptime(timestamp_str.split('.')[0], '%Y-%m-%d %H:%M:%S')
                except ValueError:
                    print(f"⚠️ Could not parse timestamp '{timestamp_str}'. Defaulting to now.")
                    event_time = datetime.utcnow()
            else:
                event_time = datetime.utcnow()
            
            # --- Step 3: Insert into the database ---
            data['timestamp_obj'] = event_time
            print(data)
            if not insert_telemetry(data):
                raise Exception("Database insertion failed")

            # --- Step 4: Build the successful output record for Firehose ---
            del data['timestamp_obj'] # Clean up before final output
            data['processing_timestamp'] = datetime.utcnow().isoformat()
            output_data = json.dumps(data) + '\n'

            output_record = {
                'recordId': record['recordId'],
                'result': 'Ok',
                'data': base64.b64encode(output_data.encode('utf-8')).decode('utf-8'),
                'metadata': {
                    'partitionKeys': {
                        'device_id': device_id,
                        'year': event_time.strftime('%Y'),
                        'month': event_time.strftime('%m'),
                        'day': event_time.strftime('%d'),
                        'hour': event_time.strftime('%H')
                    }
                }
            }
        
        except Exception as e:
            # --- This block catches any failure from the 'try' block ---
            print(f"Record processing failed for recordId {record['recordId']}: {e}")
            output_record = {
                'recordId': record['recordId'],
                'result': 'ProcessingFailed',
                'data': record['data'] # Return original data on failure
            }

        output_records.append(output_record)

    return {'records': output_records}
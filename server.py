import os
import sqlite3
import random
import string
from flask import Flask, request, jsonify, send_from_directory, Response, session
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash

# Optional Supabase import
try:
    from supabase import create_client, Client
except ImportError:
    create_client = None

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024 # 50 MB max
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Set app secret key for session cookies (required for authentication)
app.secret_key = os.environ.get('SECRET_KEY', 'memorybox_key_default_38120')

# ─── CORS Headers ─────────────────────────────────────────────────────────────
@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin']  = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, DELETE'
    return response

# ─── Supabase Initialization ──────────────────────────────────────────────────
SUPABASE_URL = os.environ.get('SUPABASE_URL')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY')
supabase_client = None

if create_client and SUPABASE_URL and SUPABASE_KEY:
    try:
        supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print("Connected to Supabase successfully!")
    except Exception as e:
        print("Failed to initialize Supabase client:", e)
else:
    print("Supabase credentials not set. Using local SQLite & Disk storage.")

# ─── Local Database fallback (safe init & migrations) ─────────────────────────
def init_local_db():
    if not supabase_client:
        conn = sqlite3.connect('database.sqlite')
        c = conn.cursor()
        # Create users table
        c.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password_hash TEXT
            )
        ''')
        # Create shares table
        c.execute('''
            CREATE TABLE IF NOT EXISTS shares (
                id TEXT PRIMARY KEY,
                images TEXT,
                target_name TEXT,
                user_id TEXT
            )
        ''')
        # Migration: Add user_id, creator_username, created_at columns if not present
        try:
            c.execute('ALTER TABLE shares ADD COLUMN user_id TEXT')
        except sqlite3.OperationalError:
            pass
        try:
            c.execute('ALTER TABLE shares ADD COLUMN creator_username TEXT')
        except sqlite3.OperationalError:
            pass
        try:
            c.execute('ALTER TABLE shares ADD COLUMN created_at TEXT')
        except sqlite3.OperationalError:
            pass
        conn.commit()
        conn.close()

init_local_db()

def generate_share_id(length=6):
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))

# ─── Favicon ──────────────────────────────────────────────────────────────────
FAVICON_SVG = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <text y=".9em" font-size="90">🌹</text>
</svg>'''

@app.route('/favicon.ico')
def favicon():
    return Response(FAVICON_SVG, mimetype='image/svg+xml')

@app.route('/favicon.svg')
def favicon_svg():
    return Response(FAVICON_SVG, mimetype='image/svg+xml')

# ─── Main page ────────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# ─── USER AUTHENTICATION ENDPOINTS ────────────────────────────────────────────

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    password_hash = generate_password_hash(password)
    user_id = generate_share_id(8)

    if supabase_client:
        try:
            # Check if user already exists
            res = supabase_client.table('users').select('id').eq('username', username).execute()
            if getattr(res, 'data', []):
                return jsonify({'error': 'Username already exists'}), 400

            supabase_client.table('users').insert({
                'id': user_id,
                'username': username,
                'password_hash': password_hash
            }).execute()
        except Exception as e:
            print("Supabase signup error:", e)
            return jsonify({'error': 'Failed to create user'}), 500
    else:
        conn = sqlite3.connect('database.sqlite')
        c = conn.cursor()
        try:
            c.execute('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)',
                      (user_id, username, password_hash))
            conn.commit()
        except sqlite3.IntegrityError:
            return jsonify({'error': 'Username already exists'}), 400
        finally:
            conn.close()

    session['user_id'] = user_id
    session['username'] = username
    return jsonify({'message': 'Registration successful', 'username': username})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    user_id = None
    stored_hash = None

    if supabase_client:
        try:
            res = supabase_client.table('users').select('id, password_hash').eq('username', username).execute()
            rows = getattr(res, 'data', [])
            if rows:
                user_id = rows[0]['id']
                stored_hash = rows[0]['password_hash']
        except Exception as e:
            print("Supabase login error:", e)
            return jsonify({'error': 'Database error'}), 500
    else:
        conn = sqlite3.connect('database.sqlite')
        c = conn.cursor()
        c.execute('SELECT id, password_hash FROM users WHERE username = ?', (username,))
        row = c.fetchone()
        conn.close()
        if row:
            user_id = row[0]
            stored_hash = row[1]

    if not user_id or not check_password_hash(stored_hash, password):
        return jsonify({'error': 'Invalid username or password'}), 401

    session['user_id'] = user_id
    session['username'] = username
    return jsonify({'message': 'Login successful', 'username': username})

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    if 'user_id' in session:
        return jsonify({
            'logged_in': True,
            'username': session.get('username'),
            'user_id': session.get('user_id')
        })
    return jsonify({'logged_in': False})

# ─── CREATOR DASHBOARD ENDPOINTS ──────────────────────────────────────────────

@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    user_id = session.get('user_id')
    username = (session.get('username') or '').strip().lower()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    created_shares = []
    received_shares = []

    if supabase_client:
        try:
            res = supabase_client.table('shares').select('id, images, target_name, creator_username, created_at').eq('user_id', user_id).execute()
            created_shares = getattr(res, 'data', [])
            if username:
                res_rec = supabase_client.table('shares').select('id, images, target_name, creator_username, created_at').ilike('target_name', username).neq('user_id', user_id).execute()
                received_shares = getattr(res_rec, 'data', [])
        except Exception as e:
            print("Supabase dashboard error:", e)
            return jsonify({'error': 'Failed to fetch dashboard'}), 500
    else:
        conn = sqlite3.connect('database.sqlite')
        c = conn.cursor()
        c.execute('SELECT id, images, target_name, creator_username, created_at FROM shares WHERE user_id = ? ORDER BY rowid DESC', (user_id,))
        rows = c.fetchall()
        for row in rows:
            created_shares.append({
                'id': row[0],
                'images': row[1] or '',
                'target_name': row[2] or 'My Love',
                'creator_username': row[3] or username,
                'created_at': row[4] or ''
            })

        if username:
            c.execute('''
                SELECT id, images, target_name, creator_username, created_at 
                FROM shares 
                WHERE LOWER(target_name) = ? AND (user_id IS NULL OR user_id != ?) 
                ORDER BY rowid DESC
            ''', (username, user_id))
            rec_rows = c.fetchall()
            for row in rec_rows:
                received_shares.append({
                    'id': row[0],
                    'images': row[1] or '',
                    'target_name': row[2] or 'My Love',
                    'creator_username': row[3] or 'A Secret Admirer',
                    'created_at': row[4] or ''
                })
        conn.close()

    def format_item(item):
        img_list = item['images'].split(',') if item.get('images') else []
        item['photo_count'] = len(img_list)
        item['link'] = f"/?share={item['id']}"
        return item

    formatted_created = [format_item(s) for s in created_shares]
    formatted_received = [format_item(s) for s in received_shares]

    return jsonify({
        'username': username,
        'created_shares': formatted_created,
        'received_shares': formatted_received,
        'shares': formatted_created
    })

@app.route('/api/boxes/find', methods=['GET'])
def find_boxes():
    query = request.args.get('q', '').strip().lower()
    if not query:
        return jsonify({'boxes': []})

    conn = sqlite3.connect('database.sqlite')
    c = conn.cursor()
    c.execute('''
        SELECT id, images, target_name, creator_username, created_at
        FROM shares
        WHERE LOWER(id) = ? OR LOWER(creator_username) = ? OR LOWER(target_name) = ?
        ORDER BY rowid DESC LIMIT 15
    ''', (query, query, query))
    rows = c.fetchall()
    conn.close()

    boxes = []
    for r in rows:
        img_list = r[1].split(',') if r[1] else []
        boxes.append({
            'id': r[0],
            'photo_count': len(img_list),
            'target_name': r[2] or 'My Love',
            'creator_username': r[3] or 'A Secret Admirer',
            'created_at': r[4] or '',
            'link': f"/?share={r[0]}"
        })
    return jsonify({'boxes': boxes})

@app.route('/api/share/<share_id>', methods=['DELETE'])
def delete_share(share_id):
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401

    is_owner = False

    if supabase_client:
        try:
            res = supabase_client.table('shares').select('user_id').eq('id', share_id).execute()
            rows = getattr(res, 'data', [])
            if rows and rows[0]['user_id'] == user_id:
                is_owner = True
        except Exception as e:
            print("Supabase ownership check error:", e)

        if is_owner:
            try:
                # Delete DB metadata
                supabase_client.table('shares').delete().eq('id', share_id).execute()
                # Note: Storage files are left (will expire or sit in bucket) to keep this call fast
                return jsonify({'message': 'Memory box deleted successfully'})
            except Exception as e:
                print("Supabase delete error:", e)
                return jsonify({'error': 'Failed to delete'}), 500
    else:
        # SQLite Ownership check
        conn = sqlite3.connect('database.sqlite')
        c = conn.cursor()
        c.execute('SELECT user_id FROM shares WHERE id = ?', (share_id,))
        row = c.fetchone()
        if row and row[0] == user_id:
            is_owner = True

        if is_owner:
            c.execute('DELETE FROM shares WHERE id = ?', (share_id,))
            conn.commit()
        conn.close()

        if is_owner:
            return jsonify({'message': 'Memory box deleted successfully'})

    return jsonify({'error': 'Unauthorized to delete this memory box'}), 403

# ─── Photo Upload Endpoint (Associated with Creator) ──────────────────────────
@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'photos' not in request.files:
        return jsonify({'error': 'No photos provided'}), 400

    files = request.files.getlist('photos')
    share_id = generate_share_id()
    target_name = request.form.get('target_name', '')
    user_id = session.get('user_id') # Link to logged-in user if available

    saved_images = []

    if supabase_client:
        # Upload directly to Supabase storage
        for file in files:
            if file.filename == '':
                continue
            filename = secure_filename(file.filename)
            unique_filename = f"{generate_share_id(4)}_{filename}"
            bucket_filepath = f"{share_id}/{unique_filename}"
            file_bytes = file.read()

            try:
                supabase_client.storage.from_('photos').upload(
                    path=bucket_filepath,
                    file=file_bytes,
                    file_options={"content-type": file.content_type or "image/jpeg"}
                )
                public_url_obj = supabase_client.storage.from_('photos').get_public_url(bucket_filepath)
                public_url = getattr(public_url_obj, 'public_url', str(public_url_obj))
                saved_images.append(public_url)
            except Exception as e:
                print(f"Failed to upload {filename} to Supabase:", e)

        if not saved_images:
            return jsonify({'error': 'Failed to upload any files to Supabase'}), 500

    creator_username = session.get('username') or 'Your Secret Admirer'
    from datetime import datetime
    created_at = datetime.utcnow().strftime('%b %d, %Y')

    if supabase_client:
        try:
            images_str = ','.join(saved_images)
            supabase_client.table('shares').insert({
                'id': share_id,
                'images': images_str,
                'target_name': target_name,
                'user_id': user_id,
                'creator_username': creator_username,
                'created_at': created_at
            }).execute()
        except Exception as e:
            print("Failed to save share metadata in Supabase DB:", e)
            return jsonify({'error': 'Failed to save share metadata'}), 500
            
    else:
        # Fallback to local files and SQLite
        for file in files:
            if file.filename == '':
                continue
            filename        = secure_filename(file.filename)
            unique_filename = f"{generate_share_id(4)}_{filename}"
            filepath        = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
            file.save(filepath)
            saved_images.append(unique_filename)

        if not saved_images:
            return jsonify({'error': 'No valid files uploaded'}), 400

        images_str = ','.join(saved_images)

        conn = sqlite3.connect('database.sqlite')
        c = conn.cursor()
        c.execute('INSERT INTO shares (id, images, target_name, user_id, creator_username, created_at) VALUES (?, ?, ?, ?, ?, ?)',
                  (share_id, images_str, target_name, user_id, creator_username, created_at))
        conn.commit()
        conn.close()

    return jsonify({'share_id': share_id, 'message': 'Upload successful', 'creator_username': creator_username})

# ─── Get share ────────────────────────────────────────────────────────────────
@app.route('/api/share/<share_id>', methods=['GET'])
def get_share(share_id):
    if supabase_client:
        try:
            res = supabase_client.table('shares').select('images, target_name, creator_username, created_at').eq('id', share_id).execute()
            rows = getattr(res, 'data', [])
            if rows:
                images = rows[0]['images'].split(',')
                target_name = rows[0].get('target_name') or 'My Love'
                creator_username = rows[0].get('creator_username') or 'Your Secret Admirer'
                created_at = rows[0].get('created_at') or ''
                return jsonify({
                    'images': images,
                    'target_name': target_name,
                    'creator_username': creator_username,
                    'created_at': created_at
                })
            else:
                return jsonify({'error': 'Share not found in Supabase'}), 404
        except Exception as e:
            print("Failed to select share from Supabase:", e)
            return jsonify({'error': 'Supabase query failed'}), 500
    else:
        conn = sqlite3.connect('database.sqlite')
        c = conn.cursor()
        c.execute('SELECT images, target_name, creator_username, created_at FROM shares WHERE id = ?', (share_id,))
        row = c.fetchone()
        conn.close()

        if row:
            images           = row[0].split(',')
            target_name      = row[1] or 'My Love'
            creator_username = row[2] or 'Your Secret Admirer'
            created_at       = row[3] or ''
            image_urls       = [f"/uploads/{img}" for img in images]
            return jsonify({
                'images': image_urls,
                'target_name': target_name,
                'creator_username': creator_username,
                'created_at': created_at
            })
        else:
            return jsonify({'error': 'Share not found locally'}), 404

# ─── Serve uploads (only used in local fallback mode) ─────────────────────────
@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# ─── Boot ─────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Holographic Theater Server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)

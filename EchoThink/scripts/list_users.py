import sqlite3, json, os

db = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'db.sqlite3')
print('DB path:', db)
con = sqlite3.connect(db)
cur = con.cursor()
try:
    cur.execute("SELECT id, username, email FROM auth_user ORDER BY id")
    users = cur.fetchall()
except Exception as e:
    users = f'ERROR: {e}'
try:
    cur.execute("SELECT id, user_id, nome FROM authentication_userprofile ORDER BY id")
    profiles = cur.fetchall()
except Exception as e:
    profiles = f'ERROR: {e}'
con.close()
print('USERS:', json.dumps(users))
print('PROFILES:', json.dumps(profiles))

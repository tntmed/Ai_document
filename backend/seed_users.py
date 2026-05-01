"""
seed_users.py — Insert real staff users from PCM Computer Center.

Run:
    cd backend
    venv\\Scripts\\python seed_users.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, Role, UserRole
from app.core.security import hash_password

DEFAULT_PASSWORD = "123456"

# sub_department → department_id
DEPT_ID = {
    "ช่าง":       4,
    "Programmer":  3,
    "Internet":    2,
    "ธุรการ":      1,
}

# Role column value → system role name
ROLE_MAP = {
    "admin":                  "admin",
    "ที่ปรึกษา":              "chief",
    "ผอ.ศูนย์":               "chief",
    "หัวหน้าช่าง":             "department_head",
    "หัวหน้าโปรแกรมเมอร์":     "department_head",
    "หัวหน้าอินเทอร์เน็ต":     "department_head",
    "หัวหน้าธุรการ":            "admin_staff",
    "STAFF":                   "staff",
}

# (username, first_name, last_name, role_label, sub_dept, phone, email, position)
USERS = [
    ("admin",  "ผู้ดูแลระบบ",      "",                  "admin",              None,          "",           "",                            "System Administrator"),
    ("kasom",  "นพ.กศม",          "ภังคานนท์",       "ที่ปรึกษา",          None,          "0818456844", "kasombgn@pcm.ac.th",          "ที่ปรึกษา"),
    ("tntmed", "นพ.ธนกร",         "เทียนศรี",         "ผอ.ศูนย์",           None,          "0991988988", "tntmed@pcm.ac.th",            "ผู้อำนวยการศูนย์"),
    ("com26",  "จ.ส.อ.ชัยณรงค์",  "แพทย์วงษ์",       "STAFF",              "ช่าง",        "0863499290", "chainarong.pw@pcm.ac.th",    "ช่างเทคนิค"),
    ("com43",  "จ.ส.อ.จักรพงษ์",  "ฉัตรชานนท์",      "หัวหน้าช่าง",        "ช่าง",        "064-8600482","jakkapong.chart@pcm.ac.th",  "หัวหน้าช่าง"),
    ("com05",  "จ.ส.อ.พิษณุ",     "ศรีสุลัย",         "STAFF",              "ช่าง",        "0635859361", "pitsanu.ssl@pcm.ac.th",      "ช่างเทคนิค"),
    ("com52",  "จ.ส.อ.ณรงค์ศักดิ์","ยาสี",             "หัวหน้าโปรแกรมเมอร์","Programmer",  "0866903828", "narongsak.yasi@pcm.ac.th",   "หัวหน้าโปรแกรมเมอร์"),
    ("com57",  "ส.อ.อารยา",        "บุรารักษ์",        "STAFF",              "ธุรการ",      "0972282528", "araya.bu@pcm.ac.th",         "เจ้าหน้าที่ธุรการ"),
    ("com56",  "ส.อ.ทศพล",         "บวชชัยภูมิ",       "STAFF",              "ช่าง",        "0845212282", "thotsaphon.bcp@pcm.ac.th",   "ช่างเทคนิค"),
    ("com07",  "น.ส.พิมพ์ชฎา",    "จินดาไพโรจน์",     "หัวหน้าธุรการ",      "ธุรการ",      "0659894618", "pk_bum@pcm.ac.th",           "หัวหน้าธุรการ"),
    ("com28",  "น.ส.สุวรรณี",      "หงสฟ้องฟ้า",       "STAFF",              "Programmer",  "0918125571", "suwannee.hong@pcm.ac.th",    "โปรแกรมเมอร์"),
    ("com30",  "น.ส.นัยนา",        "สัมฤทธิ์",         "หัวหน้าอินเทอร์เน็ต", "Internet",    "0863880084", "naiyana.sr@pcm.ac.th",       "เจ้าหน้าที่อินเทอร์เน็ต"),
    ("com29",  "น.ส.ชุติมา",       "รัตนจิตเกษม",      "STAFF",              "Internet",    "0646591991", "chutima.rat@pcm.ac.th",      "เจ้าหน้าที่อินเทอร์เน็ต"),
    ("com42",  "น.ส.สุจิตรา",      "ฉายเสมแสง",        "STAFF",              "Internet",    "0957988809", "sujitra.chai@pcm.ac.th",     "เจ้าหน้าที่อินเทอร์เน็ต"),
    ("com50",  "น.ส.สุวิดา",       "สุขเรือนสุวรรณ",   "STAFF",              "Internet",    "0846514965", "suvida.suk@pcm.ac.th",       "เจ้าหน้าที่อินเทอร์เน็ต"),
    ("com49",  "นายสัมพันธ์",       "พันธุ์เจริญ",       "STAFF",              "ช่าง",        "0868075175", "phancharean@pcm.ac.th",      "ช่างเทคนิค"),
    ("com54",  "น.ส.วรายา",        "คำเจริญ",          "STAFF",              "ธุรการ",      "0890520614", "waraya.kham@pcm.ac.th",      "เจ้าหน้าที่ธุรการ"),
    ("com35",  "น.ส.จิราพรรณ",     "ครีบภูบุตร",        "STAFF",              "Internet",    "0882182151", "jiraphan.krib@pcm.ac.th",    "เจ้าหน้าที่อินเทอร์เน็ต"),
    ("com103", "นายมงคล",           "คำปวน",            "STAFF",              "ช่าง",        "0979435106", "k.mongkon@pcm.ac.th",        "ช่างเทคนิค"),
    ("com109", "นายธนะรัตน์",       "ไกรทอง",           "STAFF",              "Programmer",  "0919909049", "thanarat.kth@pcm.ac.th",     "โปรแกรมเมอร์"),
    ("com108", "นายอัมรินทร์",       "จันทร์คทา",        "STAFF",              "Programmer",  "0969023109", "ammarin.jan@pcm.ac.th",      "โปรแกรมเมอร์"),
    ("com111", "นายสิวะณัฐ",         "ชื่นอารมย์",        "STAFF",              "Programmer",  "0852377366", "sivanut.chue@pcm.ac.th",     "โปรแกรมเมอร์"),
    ("com112", "น.ส.อรอุษา",        "ต้นโห",            "STAFF",              "Programmer",  "0959515552", "on-usa@pcm.ac.th",           "โปรแกรมเมอร์"),
    ("com117", "นายเกษม",            "คุณาอภิสิทธิ์",    "STAFF",              "ช่าง",        "0986875256", "kasem@pcm.ac.th",            "ช่างเทคนิค"),
    ("com119", "นายพัชรพล",          "ชัยภักดี",          "STAFF",              "Internet",    "0982541137", "patcharapol@pcm.ac.th",      "เจ้าหน้าที่อินเทอร์เน็ต"),
    ("com120", "น.ส.ญาณิศา",        "เชื้อมอญ",          "STAFF",              "Programmer",  "0888105173", "yanisa_c@pcm.ac.th",         "โปรแกรมเมอร์"),
    ("com122", "นายภัทรพล",          "ศรีบุญขำ",          "STAFF",              "Programmer",  "0984520631", "pattarapon@pcm.ac.th",       "โปรแกรมเมอร์"),
    ("com123", "น.ส.สุรัตน์ติกานต์", "คำลือ",             "STAFF",              "ช่าง",        "0622376235", "sulattikran.kum@pcm.ac.th",  "ช่างเทคนิค"),
]


def run():
    db = SessionLocal()
    created = skipped = 0

    try:
        roles = {r.name: r for r in db.query(Role).all()}
        missing_roles = set(ROLE_MAP.values()) - roles.keys()
        if missing_roles:
            print(f"ERROR: roles missing in DB: {missing_roles} — run seed.py first")
            return

        for username, first_name, last_name, role_label, sub_dept, phone, email, position in USERS:
            if db.query(User).filter(User.username == username).first():
                print(f"  Skipped : {username:<10} (already exists)")
                skipped += 1
                continue

            role_name = ROLE_MAP.get(role_label, "staff")
            dept_id   = DEPT_ID.get(sub_dept) if sub_dept else None
            full_name = f"{first_name} {last_name}"

            user = User(
                username=username,
                password_hash=hash_password(DEFAULT_PASSWORD),
                full_name=full_name,
                first_name=first_name,
                last_name=last_name,
                display_name=full_name,
                email=email,
                phone=phone,
                position=position,
                sub_department=sub_dept,
                department_id=dept_id,
                is_active=True,
                is_force_password_change=True,
            )
            db.add(user)
            db.flush()
            db.add(UserRole(user_id=user.id, role_id=roles[role_name].id))

            dept_label = f" [{sub_dept}]" if sub_dept else ""
            print(f"  Created : {username:<10} {full_name:<30} ({role_name}{dept_label})")
            created += 1

        db.commit()

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        db.close()

    print("-" * 60)
    print(f"  Created: {created}  |  Skipped: {skipped}")


if __name__ == "__main__":
    run()

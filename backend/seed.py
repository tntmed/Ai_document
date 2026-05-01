# แก้ไข password ให้สั้นลงและใช้รูปแบบที่ง่ายขึ้น
users_data = [
    {
        "username": "admin",
        "password": "admin123",
        "full_name": "ผู้ดูแลระบบ",
        "role": "admin",
        "dept_code": None,
    },
    {
        "username": "chief", 
        "password": "chief123",
        "full_name": "ผู้อำนวยการ ศูนย์คอมพิวเตอร์",
        "role": "chief",
        "dept_code": None,
    },
    {
        "username": "thurakarn",
        "password": "staff123", 
        "full_name": "นางสมใจ ธุรการ",
        "role": "admin_staff",
        "dept_code": "ADMIN",
    },
    {
        "username": "thurakarn2",
        "password": "staff123",
        "full_name": "นางสาวมาลี ธุรการ",
        "role": "staff",
        "dept_code": "ADMIN",
    },
    {
        "username": "nethead",
        "password": "staff123",
        "full_name": "นายสมชาย เครือข่าย",
        "role": "department_head",
        "dept_code": "IT-NET",
    },
    {
        "username": "netsec",
        "password": "staff123",
        "full_name": "นายวิชัย ระบบเครือข่าย",
        "role": "staff",
        "dept_code": "IT-NET",
    },
    {
        "username": "proghead",
        "password": "staff123",
        "full_name": "นายสุรชัย โปรแกรมเมอร์",
        "role": "department_head",
        "dept_code": "PROG",
    },
    {
        "username": "dev1",
        "password": "staff123",
        "full_name": "นางสาวอรุณี นักพัฒนา",
        "role": "staff",
        "dept_code": "PROG",
    },
    {
        "username": "techhead",
        "password": "staff123",
        "full_name": "นายประสิทธิ์ ช่างเทคนิค",
極端
    {
        "username": "tech1",
        "password": "staff123", 
        "full_name": "นายอนุชา ช่างซ่อม",
        "role": "staff",
        "dept_code": "TECH",
    },
]"""
Seed script — creates default departments, roles, users, and routing rules.
Safe to run multiple times (idempotent).
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import Department, Role, User, UserRole
from app.models.routing import RoutingRule
from app.core.security import hash_password


def get_or_create(db, model, defaults=None, **kwargs):
    instance = db.query(model).filter_by(**kwargs).first()
    if instance:
        return instance, False
    params = {**kwargs, **(defaults or {})}
    instance = model(**params)
    db.add(instance)
    db.flush()
    return instance, True


def seed():
    db = SessionLocal()
    try:
        print("Seeding departments...")
        dept_data = [
            {"name": "ธุรการ",       "code": "ADMIN"},
            {"name": "อินเตอร์เนต",  "code": "IT-NET"},
            {"name": "โปรแกรมเมอร์", "code": "PROG"},
            {"name": "ช่าง",          "code": "TECH"},
        ]
        depts = {}
        for d in dept_data:
            dept, created = get_or_create(db, Department, code=d["code"], defaults={"name": d["name"]})
            depts[d["code"]] = dept
            if created:
                print(f"  + Department: {d['name']}")

        print("Seeding roles...")
        role_names = ["admin", "chief", "admin_staff", "department_head", "staff", "viewer"]
        roles = {}
        for rn in role_names:
            role, created = get_or_create(db, Role, name=rn)
            roles[rn] = role
            if created:
                print(f"  + Role: {rn}")

        print("Seeding users...")
        users_data = [
            {
                "username": "admin",
                "password": "admin123",
                "full_name": "ผู้ดูแลระบบ",
                "role": "admin",
                "dept_code": None,
            },
            {
                "username": "chief",
                "password": "chief123",
                "full_name": "ผู้อำนวยการ ศูนย์คอมพิวเตอร์",
                "role": "chief",
                "dept_code": None,
            },
            {
                "username": "thurakarn",
                "password": "staff123",
                "full_name": "นางสมใจ ธุรการ",
                "role": "admin_staff",
                "dept_code": "ADMIN",
            },
            {
                "username": "thurakarn2",
                "password": "staff123",
                "full_name": "นางสาวมาลี ธุรการ",
                "role": "staff",
                "dept_code": "ADMIN",
            },
            {
                "username": "nethead",
                "password": "staff123",
                "full_name": "นายสมชาย เครือข่าย",
                "role": "department_head",
                "dept_code": "IT-NET",
            },
            {
                "username": "netsec",
                "password": "staff123",
                "full_name": "นายวิชัย ระบบเครือข่าย",
                "role": "staff",
                "dept_code": "IT-NET",
            },
            {
                "username": "proghead",
                "password": "staff123",
                "full_name": "นายสุรชัย โปรแกรมเมอร์",
                "role": "department_head",
                "dept_code": "PROG",
            },
            {
                "username": "dev1",
                "password": "staff123",
                "full_name": "นางสาวอรุณี นักพัฒนา",
                "role": "staff",
                "dept_code": "PROG",
            },
            {
                "username": "techhead",
                "password": "staff123",
                "full_name": "นายประสิทธิ์ ช่างเทคนิค",
                "role": "department_head",
                "dept_code": "TECH",
            },
            {
                "username": "tech1",
                "password": "staff123",
                "full_name": "นายอนุชา ช่างซ่อม",
                "role": "staff",
                "dept_code": "TECH",
            },
        ]

        for ud in users_data:
            existing = db.query(User).filter(User.username == ud["username"]).first()
            if not existing:
                dept_id = depts[ud["dept_code"]].id if ud["dept_code"] else None
                user = User(
                    username=ud["username"],
                    password_hash=hash_password(ud["password"]),
                    full_name=ud["full_name"],
                    department_id=dept_id,
                )
                db.add(user)
                db.flush()
                db.add(UserRole(user_id=user.id, role_id=roles[ud["role"]].id))
                print(f"  + User: {ud['username']} ({ud['role']})")

        print("Seeding routing rules...")
        routing_data = [
            # ช่าง
            {"keyword": "ส่งซ่อม",        "dept_code": "TECH", "priority": 5},
            {"keyword": "คอมเสีย",         "dept_code": "TECH", "priority": 5},
            {"keyword": "ติดตั้งคอม",      "dept_code": "TECH", "priority": 4},
            {"keyword": "ย้ายคอม",         "dept_code": "TECH", "priority": 4},
            {"keyword": "ซ่อมแซม",         "dept_code": "TECH", "priority": 3},
            {"keyword": "ชำรุด",           "dept_code": "TECH", "priority": 3},
            # โปรแกรมเมอร์
            {"keyword": "ลงโปรแกรม",       "dept_code": "PROG", "priority": 5},
            {"keyword": "ระบบงาน",         "dept_code": "PROG", "priority": 5},
            {"keyword": "ติดตั้งซอฟต์แวร์","dept_code": "PROG", "priority": 4},
            {"keyword": "โปรแกรม",         "dept_code": "PROG", "priority": 2},
            {"keyword": "software",        "dept_code": "PROG", "priority": 2},
            # อินเตอร์เนต
            {"keyword": "ขอ Internet",     "dept_code": "IT-NET", "priority": 5},
            {"keyword": "LAN",             "dept_code": "IT-NET", "priority": 5},
            {"keyword": "Wi-Fi",           "dept_code": "IT-NET", "priority": 5},
            {"keyword": "IP Address",      "dept_code": "IT-NET", "priority": 5},
            {"keyword": "เครือข่าย",        "dept_code": "IT-NET", "priority": 3},
            {"keyword": "internet",        "dept_code": "IT-NET", "priority": 3},
            # ธุรการ
            {"keyword": "reset password",  "dept_code": "ADMIN", "priority": 5},
            {"keyword": "รหัสผ่าน",         "dept_code": "ADMIN", "priority": 4},
        ]

        for rd in routing_data:
            dept = depts[rd["dept_code"]]
            existing = (
                db.query(RoutingRule)
                .filter(RoutingRule.keyword == rd["keyword"])
                .first()
            )
            if not existing:
                db.add(RoutingRule(
                    keyword=rd["keyword"],
                    target_department_id=dept.id,
                    priority=rd["priority"],
                    is_active=True,
                ))
                print(f"  + Rule: '{rd['keyword']}' → {rd['dept_code']}")

        db.commit()
        print("\nSeed completed successfully.")
    except Exception as e:
        db.rollback()
        print(f"Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

import os
import sqlite3
import subprocess
import sys
from contextlib import closing
from pathlib import Path


def test_migration_keeps_existing_maintenance_and_attachments(tmp_path):
    path = tmp_path / "migration.db"
    environment = {
        **os.environ,
        "DATABASE_URL": "sqlite:///" + str(path),
        "DATA_DIR": str(tmp_path / "files"),
    }

    def migrate(target, direction="upgrade"):
        subprocess.run(
            [sys.executable, "-m", "alembic", direction, target],
            cwd=Path(__file__).parents[1],
            env=environment,
            capture_output=True,
            text=True,
            check=True,
        )

    migrate("b37b9e69a911")
    with closing(sqlite3.connect(path)) as db:
        db.executescript("""
            PRAGMA foreign_keys=ON;
            INSERT INTO organizations(id,name,currency,timezone,country,demo) VALUES('org','Synthetic','KES','Africa/Nairobi','KE',1);
            INSERT INTO users(id,email,name,password_hash,active) VALUES('user','example@example.com','Synthetic','not-a-password',1);
            INSERT INTO properties(id,org_id,name,location,county,contact,archived) VALUES('property','org','Synthetic','Example','','',0);
            INSERT INTO units(id,org_id,property_id,building,floor,number,unit_type,default_rent,archived)
                VALUES('unit','org','property','Main','','A01','Residential',4500000,0);
            INSERT INTO tenants(id,org_id,name,email,phone,emergency_contact)
                VALUES('tenant','org','Synthetic Tenant','','','');
            INSERT INTO tenancies(id,org_id,unit_id,tenant_id,reference,rent,deposit,due_day,start_date,status)
                VALUES('lease','org','unit','tenant','JOJO-SYNTHETIC',4000000,0,5,'2026-01-01','active');
            INSERT INTO charges(id,org_id,tenancy_id,period,kind,description,amount,currency,due_date)
                VALUES('charge','org','lease','2026-01','rent','Existing rent',4000000,'KES','2026-01-05');
            INSERT INTO maintenance(id,org_id,property_id,created_by,title,description,category,priority,status,assigned_to,cost,updates,created_at)
                VALUES('request','org','property','user','Synthetic request','Example request','General','normal','submitted','',0,'[]','2026-01-01');
            INSERT INTO attachments(id,org_id,property_id,maintenance_id,name,storage_name,content_type,size,created_by,created_at)
                VALUES('attachment','org','property','request','example.txt','synthetic-path','text/plain',3,'user','2026-01-01');
        """)
        db.commit()
    migrate("head")
    migrate("b37b9e69a911", "downgrade")
    migrate("head")
    with closing(sqlite3.connect(path)) as db:
        assert db.execute("SELECT maintenance_id FROM attachments").fetchall() == [("request",)]
        assert db.execute("SELECT id, provider_id FROM maintenance").fetchall() == [
            ("request", None)
        ]
        assert db.execute("PRAGMA foreign_key_check").fetchall() == []
        assert db.execute("SELECT usage, default_rent FROM units").fetchall() == [
            ("residential", 4500000)
        ]
        assert db.execute("SELECT unit_id, rent FROM tenancies").fetchall() == [("unit", 4000000)]
        assert db.execute("SELECT tenancy_id, amount FROM charges").fetchall() == [
            ("lease", 4000000)
        ]

-- 002_check_role_type_ref.sql
--
-- soft-fk: type_ref_id must exist in organization_type or venue_type

CREATE OR REPLACE FUNCTION check_role_type_ref()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.managed_entity_type = 'organization' THEN
        IF NOT EXISTS (
            SELECT 1 FROM organization_type
            WHERE id = NEW.type_ref_id
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'role: type_ref_id % does not exist in organization_type',
                NEW.type_ref_id;
        END IF;

    ELSIF NEW.managed_entity_type = 'venue' THEN
        IF NOT EXISTS (
            SELECT 1 FROM venue_type
            WHERE id = NEW.type_ref_id
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'role: type_ref_id % does not exist in venue_type',
                NEW.type_ref_id;
        END IF;

    ELSIF NEW.managed_entity_type = 'facility' THEN
        IF NOT EXISTS (
            SELECT 1 FROM facility_type
            WHERE id = NEW.type_ref_id
            AND deleted_at IS NULL
        ) THEN
            RAISE EXCEPTION
                'role: type_ref_id % does not exist in facility_type',
                NEW.type_ref_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_role_type_ref ON role;

---split---
CREATE TRIGGER trg_check_role_type_ref
BEFORE INSERT OR UPDATE OF type_ref_id, managed_entity_type
ON role
FOR EACH ROW EXECUTE FUNCTION check_role_type_ref();

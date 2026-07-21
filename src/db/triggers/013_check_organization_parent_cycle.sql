-- 013_check_organization_parent_cycle.sql
--
-- prevents circular parent references in the organization hierarchy

CREATE OR REPLACE FUNCTION check_organization_parent_cycle()
RETURNS TRIGGER AS $$
DECLARE
    v_current_id INTEGER := NEW.parent_organization_id;
BEGIN
    IF NEW.parent_organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    WHILE v_current_id IS NOT NULL LOOP
        IF v_current_id = NEW.id THEN
            RAISE EXCEPTION
                'organization: setting parent to % would create a cycle',
                NEW.parent_organization_id;
        END IF;

        SELECT parent_organization_id INTO v_current_id
        FROM organization
        WHERE id = v_current_id
        AND deleted_at IS NULL;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_organization_parent_cycle ON organization;

---split---
CREATE TRIGGER trg_check_organization_parent_cycle
BEFORE INSERT OR UPDATE OF parent_organization_id
ON organization
FOR EACH ROW EXECUTE FUNCTION check_organization_parent_cycle();

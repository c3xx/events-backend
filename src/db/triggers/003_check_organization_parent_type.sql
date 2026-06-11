-- 003_check_organization_parent_type.sql
--
-- parent's type must be an allowed parent for this org's type

CREATE OR REPLACE FUNCTION check_organization_parent_type()
RETURNS TRIGGER AS $$
DECLARE
    v_parent_type_id SMALLINT;
BEGIN
    -- No parent is fine for root types
    IF NEW.parent_organization_id IS NULL THEN
        -- If this type has any allowed parents defined, it cannot be a root
        IF EXISTS (
            SELECT 1 FROM organization_type_allowed_parent
            WHERE child_type_id = NEW.organization_type_id
        ) THEN
            RAISE EXCEPTION
                'organization: type % must have a parent, it is not allowed to be a root',
                NEW.organization_type_id;
        END IF;
        RETURN NEW;
    END IF;

    -- Get the parent's organization type
    SELECT organization_type_id INTO v_parent_type_id
    FROM organization
    WHERE id = NEW.parent_organization_id
    AND deleted_at IS NULL;

    IF v_parent_type_id IS NULL THEN
        RAISE EXCEPTION
            'organization: parent organization % does not exist or is deleted',
            NEW.parent_organization_id;
    END IF;

    -- Check if (child_type, parent_type) is an allowed combination
    IF NOT EXISTS (
        SELECT 1 FROM organization_type_allowed_parent
        WHERE child_type_id = NEW.organization_type_id
        AND parent_type_id = v_parent_type_id
    ) THEN
        RAISE EXCEPTION
            'organization: type % is not allowed to be placed under type %',
            NEW.organization_type_id,
            v_parent_type_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

---split---
DROP TRIGGER IF EXISTS trg_check_organization_parent_type ON organization;

---split---
CREATE TRIGGER trg_check_organization_parent_type
BEFORE INSERT OR UPDATE OF parent_organization_id, organization_type_id
ON organization
FOR EACH ROW EXECUTE FUNCTION check_organization_parent_type();

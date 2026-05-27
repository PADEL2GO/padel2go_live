-- ============================================================
-- Prevent the group creator from removing their own membership row.
-- Creator must use DELETE on chat_groups instead (which cascades).
-- This avoids an orphan state where the group exists but its creator
-- has lost SELECT access on chat_messages (no longer a member).
-- ============================================================

CREATE OR REPLACE FUNCTION public.prevent_creator_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.chat_groups
    WHERE id = OLD.group_id AND created_by = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Group creator cannot leave the group. Delete the group instead.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS chat_group_members_no_creator_leave ON public.chat_group_members;
CREATE TRIGGER chat_group_members_no_creator_leave
  BEFORE DELETE ON public.chat_group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_creator_leave();

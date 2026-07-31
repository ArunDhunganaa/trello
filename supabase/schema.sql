-- TaskFlow — Full Schema
-- Run this in the Supabase SQL editor.
-- Prerequisites: pgcrypto extension (usually pre-enabled on Supabase).

-- ─────────────────────────────────────────────────────────────
-- Profiles (extends auth.users 1-to-1)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT NOT NULL,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create a profile row when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- Boards
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.boards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  background   TEXT NOT NULL DEFAULT '#0079BF',
  is_starred   BOOLEAN NOT NULL DEFAULT false,
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Board members (join table — also encodes role)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.board_members (
  board_id  UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  PRIMARY KEY (board_id, user_id)
);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Lists
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  position     FLOAT8 NOT NULL,
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Cards  (board_id is denormalized so Realtime can filter by
--         board without joining through lists)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.cards (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id      UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  board_id     UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  position     FLOAT8 NOT NULL,
  due_date     TIMESTAMPTZ,
  cover_color  TEXT,
  is_archived  BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Labels  (scoped to a board)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.labels (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id  UUID NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  name      TEXT,
  color     TEXT NOT NULL
);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Card ↔ label mapping
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.card_labels (
  card_id   UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  label_id  UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

ALTER TABLE public.card_labels ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Checklists
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.checklists (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id   UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  title     TEXT NOT NULL,
  position  FLOAT8 NOT NULL
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- Checklist items
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.checklist_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id  UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  is_completed  BOOLEAN NOT NULL DEFAULT false,
  position      FLOAT8 NOT NULL
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger (boards + cards)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER boards_updated_at
  BEFORE UPDATE ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE TRIGGER cards_updated_at
  BEFORE UPDATE ON public.cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Helper functions (used in RLS policies)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_board_member(board_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = board_uuid AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_board_owner_or_admin(board_uuid UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.board_members
    WHERE board_id = board_uuid AND user_id = auth.uid() AND role IN ('owner', 'admin')
  );
$$;

-- ─────────────────────────────────────────────────────────────
-- RLS: Boards
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can view boards"
  ON public.boards FOR SELECT TO authenticated
  USING (public.is_board_member(id));

CREATE POLICY "Authenticated users can create boards"
  ON public.boards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Board owners/admins can update boards"
  ON public.boards FOR UPDATE TO authenticated
  USING (public.is_board_owner_or_admin(id));

CREATE POLICY "Board owners can delete boards"
  ON public.boards FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Auto-add the board creator as 'owner' in board_members
CREATE OR REPLACE FUNCTION public.handle_new_board()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.board_members (board_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_board_created
  AFTER INSERT ON public.boards
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_board();

-- ─────────────────────────────────────────────────────────────
-- RLS: Board Members
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can view membership"
  ON public.board_members FOR SELECT TO authenticated
  USING (public.is_board_member(board_id));

CREATE POLICY "Board owners/admins can add members"
  ON public.board_members FOR INSERT TO authenticated
  WITH CHECK (public.is_board_owner_or_admin(board_id));

CREATE POLICY "Remove self or be an owner/admin"
  ON public.board_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_board_owner_or_admin(board_id));

-- ─────────────────────────────────────────────────────────────
-- RLS: Lists
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can view lists"
  ON public.lists FOR SELECT TO authenticated USING (public.is_board_member(board_id));

CREATE POLICY "Board members can create lists"
  ON public.lists FOR INSERT TO authenticated WITH CHECK (public.is_board_member(board_id));

CREATE POLICY "Board members can update lists"
  ON public.lists FOR UPDATE TO authenticated USING (public.is_board_member(board_id));

CREATE POLICY "Board owners/admins can delete lists"
  ON public.lists FOR DELETE TO authenticated USING (public.is_board_owner_or_admin(board_id));

-- ─────────────────────────────────────────────────────────────
-- RLS: Cards
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can view cards"
  ON public.cards FOR SELECT TO authenticated USING (public.is_board_member(board_id));

CREATE POLICY "Board members can create cards"
  ON public.cards FOR INSERT TO authenticated WITH CHECK (public.is_board_member(board_id));

CREATE POLICY "Board members can update cards"
  ON public.cards FOR UPDATE TO authenticated USING (public.is_board_member(board_id));

CREATE POLICY "Board members can delete cards"
  ON public.cards FOR DELETE TO authenticated USING (public.is_board_member(board_id));

-- ─────────────────────────────────────────────────────────────
-- RLS: Labels
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can manage labels"
  ON public.labels FOR ALL TO authenticated
  USING (public.is_board_member(board_id))
  WITH CHECK (public.is_board_member(board_id));

-- ─────────────────────────────────────────────────────────────
-- RLS: Card Labels
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can manage card labels"
  ON public.card_labels FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_id AND public.is_board_member(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_id AND public.is_board_member(c.board_id)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: Checklists
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can manage checklists"
  ON public.checklists FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_id AND public.is_board_member(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cards c
      WHERE c.id = card_id AND public.is_board_member(c.board_id)
    )
  );

-- ─────────────────────────────────────────────────────────────
-- RLS: Checklist Items
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "Board members can manage checklist items"
  ON public.checklist_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id AND public.is_board_member(c.board_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.checklists cl
      JOIN public.cards c ON c.id = cl.card_id
      WHERE cl.id = checklist_id AND public.is_board_member(c.board_id)
    )
  );

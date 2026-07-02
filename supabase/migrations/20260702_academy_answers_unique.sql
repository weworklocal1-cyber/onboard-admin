DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'academy_answers') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'academy_answers_attempt_question_unique'
    ) THEN
      ALTER TABLE academy_answers
        ADD CONSTRAINT academy_answers_attempt_question_unique UNIQUE (attempt_id, question_id);
    END IF;
  END IF;
END $$;

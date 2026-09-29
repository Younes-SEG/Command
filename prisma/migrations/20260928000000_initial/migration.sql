CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "AssessmentType" AS ENUM ('ASSIGNMENT', 'LAB', 'QUIZ', 'MIDTERM', 'FINAL_EXAM', 'PROJECT', 'OTHER');
CREATE TYPE "AssessmentStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'GRADED');
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

CREATE TABLE "Semester" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Semester_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Semester_dates_check" CHECK ("endDate" >= "startDate")
);

CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "semesterId" TEXT NOT NULL,
  "instructor" TEXT,
  "color" TEXT NOT NULL DEFAULT '#5b67e8',
  "notes" TEXT NOT NULL DEFAULT '',
  "archived" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Assessment" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "AssessmentType" NOT NULL DEFAULT 'ASSIGNMENT',
  "dueDate" TIMESTAMP(3),
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "score" DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "status" "AssessmentStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "notes" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Assessment_weight_check" CHECK ("weight" >= 0 AND "weight" <= 100),
  CONSTRAINT "Assessment_score_check" CHECK ("maxScore" > 0 AND ("score" IS NULL OR ("score" >= 0 AND "score" <= "maxScore"))),
  CONSTRAINT "Assessment_status_check" CHECK (("status" = 'GRADED') = ("score" IS NOT NULL))
);

CREATE TABLE "Task" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "dueDate" TIMESTAMP(3),
  "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
  "estimatedMinutes" INTEGER,
  "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "courseId" TEXT,
  "assessmentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "Task_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Task_duration_check" CHECK ("estimatedMinutes" IS NULL OR "estimatedMinutes" > 0),
  CONSTRAINT "Task_completion_check" CHECK (("status" = 'COMPLETED') = ("completedAt" IS NOT NULL))
);

CREATE TABLE "Subtask" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Subtask_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalendarEvent" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "allDay" BOOLEAN NOT NULL DEFAULT false,
  "location" TEXT NOT NULL DEFAULT '',
  "courseId" TEXT,
  "color" TEXT NOT NULL DEFAULT '#5b67e8',
  CONSTRAINT "CalendarEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CalendarEvent_dates_check" CHECK ("endAt" > "startAt")
);

CREATE TABLE "ScheduleEntry" (
  "id" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "dayOfWeek" INTEGER NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT '',
  CONSTRAINT "ScheduleEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ScheduleEntry_day_check" CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  CONSTRAINT "ScheduleEntry_time_check" CHECK ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" > "startTime")
);

CREATE TABLE "Settings" (
  "id" TEXT NOT NULL DEFAULT 'preferences',
  "displayName" TEXT NOT NULL DEFAULT '',
  "theme" "Theme" NOT NULL DEFAULT 'SYSTEM',
  "timeFormat" TEXT NOT NULL DEFAULT '12',
  "weekStartsOn" INTEGER NOT NULL DEFAULT 1,
  "showCompleted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Settings_preferences_check" CHECK ("id" = 'preferences' AND "timeFormat" IN ('12', '24') AND "weekStartsOn" IN (0, 1))
);

CREATE UNIQUE INDEX "Semester_one_active" ON "Semester" ("isActive") WHERE "isActive" = true;
CREATE UNIQUE INDEX "Course_semesterId_code_key" ON "Course" ("semesterId", "code");
CREATE INDEX "Course_semesterId_archived_idx" ON "Course" ("semesterId", "archived");
CREATE INDEX "Assessment_courseId_dueDate_idx" ON "Assessment" ("courseId", "dueDate");
CREATE INDEX "Task_status_dueDate_idx" ON "Task" ("status", "dueDate");
CREATE INDEX "Task_courseId_idx" ON "Task" ("courseId");
CREATE INDEX "Task_assessmentId_idx" ON "Task" ("assessmentId");
CREATE INDEX "Subtask_taskId_position_idx" ON "Subtask" ("taskId", "position");
CREATE INDEX "CalendarEvent_startAt_endAt_idx" ON "CalendarEvent" ("startAt", "endAt");
CREATE INDEX "CalendarEvent_courseId_idx" ON "CalendarEvent" ("courseId");
CREATE INDEX "ScheduleEntry_courseId_dayOfWeek_idx" ON "ScheduleEntry" ("courseId", "dayOfWeek");

ALTER TABLE "Course" ADD CONSTRAINT "Course_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Subtask" ADD CONSTRAINT "Subtask_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleEntry" ADD CONSTRAINT "ScheduleEntry_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- A workspace always has exactly one preferences record, even without demo data.
INSERT INTO "Settings" ("id") VALUES ('preferences');

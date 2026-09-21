-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'OUTDATED');
CREATE TYPE "LandmarkStatus" AS ENUM ('AI_DRAFT', 'BUDDY_VERIFIED', 'PUBLISHED', 'OUTDATED');
CREATE TYPE "LandmarkType" AS ENUM ('SIGN', 'ROOM_ENTRANCE', 'RECEPTION', 'CHECK_IN_GATE', 'ELEVATOR_AREA', 'CORRIDOR_MARKER', 'RESTROOM', 'MEETING_ROOM', 'CANTEEN', 'OTHER');
CREATE TYPE "RelativeManeuver" AS ENUM ('GO_STRAIGHT', 'TURN_LEFT', 'TURN_RIGHT', 'TAKE_ELEVATOR', 'ENTER_DOOR', 'OTHER');
CREATE TYPE "SessionMode" AS ENUM ('LEARN', 'NAVIGATE');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'AWAITING_START_CONFIRMATION', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Route" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "status" "RouteStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Landmark" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "LandmarkType" NOT NULL,
    "description" VARCHAR(300) NOT NULL,
    "visibleText" TEXT[],
    "stableFeatures" TEXT[],
    CONSTRAINT "Landmark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RouteLandmark" (
    "routeId" UUID NOT NULL,
    "landmarkId" UUID NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "status" "LandmarkStatus" NOT NULL,
    CONSTRAINT "RouteLandmark_pkey" PRIMARY KEY ("routeId", "landmarkId"),
    CONSTRAINT "RouteLandmark_displayOrder_nonnegative" CHECK ("displayOrder" >= 0)
);

CREATE TABLE "RouteEdge" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "fromLandmarkId" UUID NOT NULL,
    "toLandmarkId" UUID NOT NULL,
    "maneuver" "RelativeManeuver" NOT NULL,
    "spokenCue" VARCHAR(300) NOT NULL,
    CONSTRAINT "RouteEdge_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RouteEdge_displayOrder_nonnegative" CHECK ("displayOrder" >= 0),
    CONSTRAINT "RouteEdge_no_self_loop" CHECK ("fromLandmarkId" <> "toLandmarkId")
);

CREATE TABLE "RouteSession" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "mode" "SessionMode" NOT NULL,
    "status" "SessionStatus" NOT NULL,
    "currentPathIndex" INTEGER,
    "originLandmarkId" UUID,
    "destinationLandmarkId" UUID,
    "expectedLandmarkId" UUID,
    "plannedPath" JSONB,
    "startedAt" TIMESTAMPTZ(3) NOT NULL,
    "finishedAt" TIMESTAMPTZ(3),
    CONSTRAINT "RouteSession_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RouteSession_pathIndex_nonnegative" CHECK ("currentPathIndex" IS NULL OR "currentPathIndex" >= 0)
);

CREATE TABLE "Observation" (
    "id" UUID NOT NULL,
    "requestId" VARCHAR(100) NOT NULL,
    "sessionId" UUID NOT NULL,
    "capturedAt" TIMESTAMPTZ(3) NOT NULL,
    "perception" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Observation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LandmarkReview" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "landmarkId" UUID NOT NULL,
    "status" "LandmarkStatus" NOT NULL,
    "reviewerRole" VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LandmarkReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Route_status_idx" ON "Route"("status");
CREATE INDEX "RouteLandmark_routeId_displayOrder_idx" ON "RouteLandmark"("routeId", "displayOrder");
CREATE UNIQUE INDEX "RouteLandmark_routeId_landmarkId_key" ON "RouteLandmark"("routeId", "landmarkId");
CREATE INDEX "RouteEdge_routeId_displayOrder_idx" ON "RouteEdge"("routeId", "displayOrder");
CREATE UNIQUE INDEX "RouteEdge_routeId_fromLandmarkId_toLandmarkId_key" ON "RouteEdge"("routeId", "fromLandmarkId", "toLandmarkId");
CREATE INDEX "RouteSession_routeId_status_idx" ON "RouteSession"("routeId", "status");
CREATE INDEX "Observation_sessionId_capturedAt_idx" ON "Observation"("sessionId", "capturedAt");
CREATE UNIQUE INDEX "Observation_sessionId_requestId_key" ON "Observation"("sessionId", "requestId");
CREATE INDEX "LandmarkReview_routeId_landmarkId_createdAt_idx" ON "LandmarkReview"("routeId", "landmarkId", "createdAt");

-- AddForeignKey
ALTER TABLE "RouteLandmark" ADD CONSTRAINT "RouteLandmark_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteLandmark" ADD CONSTRAINT "RouteLandmark_landmarkId_fkey" FOREIGN KEY ("landmarkId") REFERENCES "Landmark"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RouteEdge" ADD CONSTRAINT "RouteEdge_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteEdge" ADD CONSTRAINT "RouteEdge_routeId_fromLandmarkId_fkey" FOREIGN KEY ("routeId", "fromLandmarkId") REFERENCES "RouteLandmark"("routeId", "landmarkId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteEdge" ADD CONSTRAINT "RouteEdge_routeId_toLandmarkId_fkey" FOREIGN KEY ("routeId", "toLandmarkId") REFERENCES "RouteLandmark"("routeId", "landmarkId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RouteSession" ADD CONSTRAINT "RouteSession_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "Route"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Observation" ADD CONSTRAINT "Observation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "RouteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LandmarkReview" ADD CONSTRAINT "LandmarkReview_routeId_landmarkId_fkey" FOREIGN KEY ("routeId", "landmarkId") REFERENCES "RouteLandmark"("routeId", "landmarkId") ON DELETE CASCADE ON UPDATE CASCADE;

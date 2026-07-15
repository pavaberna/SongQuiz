-- CreateTable
CREATE TABLE "Track" (
    "id" SERIAL NOT NULL,
    "youtubeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "artist" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "genres" TEXT[],
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Track_youtubeId_key" ON "Track"("youtubeId");

-- CreateIndex
CREATE INDEX "Track_youtubeId_idx" ON "Track"("youtubeId");

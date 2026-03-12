-- CreateTable
CREATE TABLE "StepImage" (
    "stepText" TEXT NOT NULL PRIMARY KEY,
    "imageUrl" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

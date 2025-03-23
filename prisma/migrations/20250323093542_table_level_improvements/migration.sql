/*
  Warnings:

  - You are about to drop the column `bookingReference` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `contactEmail` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `contactPhone` on the `bookings` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "bookings_bookingReference_key";

-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "bookingReference",
DROP COLUMN "contactEmail",
DROP COLUMN "contactPhone";

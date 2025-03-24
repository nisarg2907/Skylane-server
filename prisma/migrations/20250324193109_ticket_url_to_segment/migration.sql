/*
  Warnings:

  - You are about to drop the column `ticketUrl` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "bookings" DROP COLUMN "ticketUrl";

-- AlterTable
ALTER TABLE "flight_segments" ADD COLUMN     "ticketUrl" TEXT;

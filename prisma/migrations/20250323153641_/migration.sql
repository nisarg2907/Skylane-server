-- DropForeignKey
ALTER TABLE "bookings" DROP CONSTRAINT "bookings_userId_fkey";

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("authId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "paymentMethodId" TEXT;

-- AlterTable
ALTER TABLE "payment_methods" ADD COLUMN     "encryptedCardNumber" TEXT,
ADD COLUMN     "encryptedCvv" TEXT;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Access" DROP CONSTRAINT "Access_pkey",
ADD CONSTRAINT "Access_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "MarketData" ADD CONSTRAINT "MarketData_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey",
ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_pkey",
ADD CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE `USER` (
    `user_id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `USER_email_key`(`email`),
    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `USER_PROFILE` (
    `profile_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `height` DOUBLE NULL,
    `weight` DOUBLE NULL,
    `bmi` DOUBLE NULL,
    `disease` VARCHAR(191) NULL,
    `goal` VARCHAR(191) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `USER_PROFILE_user_id_key`(`user_id`),
    PRIMARY KEY (`profile_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WEEKLY_MEAL_PLAN` (
    `plan_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`plan_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DAILY_MEAL` (
    `daily_meal_id` INTEGER NOT NULL AUTO_INCREMENT,
    `plan_id` INTEGER NOT NULL,
    `meal_date` DATETIME(3) NULL,
    `day_number` INTEGER NULL,

    PRIMARY KEY (`daily_meal_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MEAL` (
    `meal_id` INTEGER NOT NULL AUTO_INCREMENT,
    `daily_meal_id` INTEGER NOT NULL,
    `meal_type` VARCHAR(191) NULL,
    `meal_name` VARCHAR(191) NULL,
    `ingredientsId` INTEGER NULL,
    `calories` INTEGER NULL,
    `protein` DOUBLE NULL,
    `carbs` DOUBLE NULL,
    `fat` DOUBLE NULL,
    `recipe` VARCHAR(191) NULL,
    `image_url` VARCHAR(191) NULL,

    PRIMARY KEY (`meal_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ingredients` (
    `ingredientId` INTEGER NOT NULL AUTO_INCREMENT,
    `ingredient_name` VARCHAR(191) NOT NULL,
    `image_url` VARCHAR(191) NULL,
    `category_main` VARCHAR(191) NULL,
    `category_sub` VARCHAR(191) NULL,
    `division` VARCHAR(191) NULL,

    PRIMARY KEY (`ingredientId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MEAL_CERTIFICATION` (
    `certification_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `daily_meal_id` INTEGER NOT NULL,
    `certification_date` DATETIME(3) NULL,
    `image_url` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`certification_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CART` (
    `cart_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `plan_id` INTEGER NULL,
    `alarm_sent` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`cart_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CART_ITEM` (
    `cart_item_id` INTEGER NOT NULL AUTO_INCREMENT,
    `cart_id` INTEGER NOT NULL,
    `meal_id` INTEGER NULL,
    `ingredient_name` VARCHAR(191) NULL,
    `quantity` VARCHAR(191) NULL,

    PRIMARY KEY (`cart_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `COUPON` (
    `coupon_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `coupon_code` VARCHAR(191) NOT NULL,
    `coupon_name` VARCHAR(191) NOT NULL,
    `discount_amount` INTEGER NULL,
    `issue_date` DATETIME(3) NULL,
    `expiry_date` DATETIME(3) NULL,
    `is_used` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`coupon_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `POST` (
    `post_id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `view_count` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`post_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `COMMENT` (
    `comment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `post_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `content` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`comment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `USER_PROFILE` ADD CONSTRAINT `USER_PROFILE_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `USER`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WEEKLY_MEAL_PLAN` ADD CONSTRAINT `WEEKLY_MEAL_PLAN_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `USER`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DAILY_MEAL` ADD CONSTRAINT `DAILY_MEAL_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `WEEKLY_MEAL_PLAN`(`plan_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MEAL` ADD CONSTRAINT `MEAL_daily_meal_id_fkey` FOREIGN KEY (`daily_meal_id`) REFERENCES `DAILY_MEAL`(`daily_meal_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MEAL` ADD CONSTRAINT `MEAL_ingredientsId_fkey` FOREIGN KEY (`ingredientsId`) REFERENCES `ingredients`(`ingredientId`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MEAL_CERTIFICATION` ADD CONSTRAINT `MEAL_CERTIFICATION_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `USER`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MEAL_CERTIFICATION` ADD CONSTRAINT `MEAL_CERTIFICATION_daily_meal_id_fkey` FOREIGN KEY (`daily_meal_id`) REFERENCES `DAILY_MEAL`(`daily_meal_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CART` ADD CONSTRAINT `CART_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `USER`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CART` ADD CONSTRAINT `CART_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `WEEKLY_MEAL_PLAN`(`plan_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CART_ITEM` ADD CONSTRAINT `CART_ITEM_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `CART`(`cart_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CART_ITEM` ADD CONSTRAINT `CART_ITEM_meal_id_fkey` FOREIGN KEY (`meal_id`) REFERENCES `MEAL`(`meal_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `COUPON` ADD CONSTRAINT `COUPON_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `USER`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `POST` ADD CONSTRAINT `POST_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `USER`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `COMMENT` ADD CONSTRAINT `COMMENT_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `POST`(`post_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `COMMENT` ADD CONSTRAINT `COMMENT_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `USER`(`user_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

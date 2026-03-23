-- Create holiday catalog settings (single-row logical table)
CREATE TABLE "HolidayCatalogSettings" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Праздничный каталог',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HolidayCatalogSettings_pkey" PRIMARY KEY ("id")
);

-- Create configurable holiday sections
CREATE TABLE "HolidaySection" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "isCurrentHoliday" BOOLEAN NOT NULL DEFAULT false,
  "icon" TEXT,
  "activeFrom" TIMESTAMP(3),
  "activeTo" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HolidaySection_pkey" PRIMARY KEY ("id")
);

-- Create many-to-many mapping: holiday section -> dessert
CREATE TABLE "HolidaySectionDessert" (
  "sectionId" TEXT NOT NULL,
  "dessertId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HolidaySectionDessert_pkey" PRIMARY KEY ("sectionId", "dessertId")
);

CREATE UNIQUE INDEX "HolidaySection_slug_key" ON "HolidaySection"("slug");
CREATE INDEX "HolidaySection_active_sortOrder_idx" ON "HolidaySection"("active", "sortOrder");
CREATE INDEX "HolidaySection_isCurrentHoliday_idx" ON "HolidaySection"("isCurrentHoliday");
CREATE INDEX "HolidaySectionDessert_dessertId_idx" ON "HolidaySectionDessert"("dessertId");

ALTER TABLE "HolidaySectionDessert"
  ADD CONSTRAINT "HolidaySectionDessert_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "HolidaySection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HolidaySectionDessert"
  ADD CONSTRAINT "HolidaySectionDessert_dessertId_fkey"
  FOREIGN KEY ("dessertId") REFERENCES "Dessert"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "HolidayCatalogSettings" ("id", "title", "createdAt", "updatedAt")
VALUES ('holiday-settings-default', 'Праздничный каталог', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO "HolidaySection" ("id", "name", "slug", "active", "sortOrder", "isCurrentHoliday", "createdAt", "updatedAt")
VALUES
  ('holiday-section-birthday', 'День рождения', 'birthday', true, 10, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('holiday-section-wedding', 'Свадьбы', 'weddings', true, 20, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('holiday-section-current', 'Текущий праздник', 'current-holiday', false, 30, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

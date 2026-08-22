/**
 * SomaSikolo - Prisma Schema for Local SQLite Engine (Desktop / Electron)
 */

export const PRISMA_SQLITE_SCHEMA = `
datasource db {
  provider = "sqlite"
  url      = "file:./somasikolo.db"
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String   @id @default(uuid())
  username     String   @unique
  fullName     String
  email        String   @unique
  passwordHash String
  role         String   @default("LECTURE_SEULE") // ADMIN, DIRECTEUR, SECRETAIRE, COMPTABLE, ENSEIGNANT
  phone        String?
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  logs         AuditLog[]
}

model SchoolSetting {
  id                  String   @id @default("DEFAULT")
  schoolName          String
  schoolType          String   @default("PRIVE")
  academyName         String
  capName             String
  registrationNumber  String
  address             String
  city                String
  phone               String
  email               String
  directorName        String
  currency            String   @default("FCFA")
  currentAcademicYear String   @default("2025-2026")
  activeTerm          String   @default("TRIMESTRE_1")
  logoUrl             String?
  stampUrl            String?
}

model Student {
  id               String   @id @default(uuid())
  matricule        String   @unique
  firstName        String
  lastName         String
  gender           String
  birthDate        DateTime
  birthPlace       String
  nationality      String   @default("Mali")
  address          String
  phone            String?
  photoUrl         String?
  status           String   @default("ACTIF")
  classId          String
  class            SchoolClass @relation(fields: [classId], references: [id])
  parentFatherName String
  parentFatherPhone String
  parentMotherName String
  parentMotherPhone String
  parentEmail      String?
  observations     String?
  admissionDate    DateTime @default(now())
  academicYear     String
  grades           Grade[]
  payments         Payment[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model SchoolClass {
  id             String    @id @default(uuid())
  name           String    @unique
  category       String    // FONDAMENTAL_1, FONDAMENTAL_2, LYCEE, TECHNIQUE_BT
  level          String
  section        String?
  capacity       Int       @default(40)
  monthlyFee     Float     @default(0)
  inscriptionFee Float     @default(0)
  students       Student[]
}

model Subject {
  id            String  @id @default(uuid())
  code          String  @unique
  name          String
  coefficient   Int     @default(1)
  classCategory String
  order         Int     @default(0)
}

model Teacher {
  id             String   @id @default(uuid())
  firstName      String
  lastName       String
  gender         String
  phone          String   @unique
  email          String?
  address        String
  diploma        String
  specialty      String
  monthlySalary  Float    @default(0)
  status         String   @default("ACTIF")
  hireDate       DateTime @default(now())
}

model Grade {
  id           String   @id @default(uuid())
  studentId    String
  student      Student  @relation(fields: [studentId], references: [id])
  classId      String
  subjectId    String
  term         String   // TRIMESTRE_1, TRIMESTRE_2, TRIMESTRE_3
  academicYear String
  type         String   // INTERROGATION, DEVOIR, COMPOSITION
  score        Float
  maxScore     Float    @default(20)
  coefficient  Int      @default(1)
  date         DateTime @default(now())
}

model Payment {
  id              String   @id @default(uuid())
  receiptNumber   String   @unique
  studentId       String
  student         Student  @relation(fields: [studentId], references: [id])
  category        String   // INSCRIPTION, MENSUALITE, CANTINE, TRANSPORT
  monthCovered    String?
  amountPaid      Float
  expectedAmount  Float
  remainingAmount Float
  paymentDate     DateTime @default(now())
  method          String   @default("ESPECES") // ESPECES, ORANGE_MONEY, MOOV_MONEY
  referenceNumber String?
  cashierName     String
  academicYear    String
}

model AuditLog {
  id        String   @id @default(uuid())
  timestamp DateTime @default(now())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  action    String
  module    String
  details   String
}
`;

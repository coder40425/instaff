import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import { customerWorkerSelect } from "../worker/worker.public";
import {
  effectivePartnerWorkerLimit,
  PartnerType,
} from "./partner.constants";

export const getOwnPartnerProfile = async (userId: string) => {
  const profile = await prisma.partnerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      partnerType: true,
      status: true,
      workerLimit: true,
      createdAt: true,
    },
  });

  if (!profile) throw new Error("Partner profile not found");

  const workerCount = await prisma.workerProfile.count({
    where: { partnerId: profile.id },
  });
  const workerLimit = effectivePartnerWorkerLimit(
    profile.partnerType as PartnerType,
    profile.workerLimit
  );

  return {
    id: profile.id,
    partnerType: profile.partnerType,
    status: profile.status,
    workerLimit,
    workerCount,
    createdAt: profile.createdAt,
  };
};

export const updateOwnPartnerProfile = async (userId: string, name: string) => {
  const profile = await prisma.partnerProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw new Error("Partner profile not found");

  return prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { name: true },
  });
};

export const listAssociatedWorkers = (partnerProfileId: string) =>
  prisma.workerProfile.findMany({
    where: { partnerId: partnerProfileId },
    select: customerWorkerSelect,
    orderBy: { createdAt: "desc" },
  });

const lockApprovedPartner = async (
  tx: Prisma.TransactionClient,
  partnerProfileId: string
) => {
  const locked = await tx.partnerProfile.updateMany({
    where: { id: partnerProfileId, status: "APPROVED" },
    data: { updatedAt: new Date() },
  });

  if (locked.count !== 1) {
    throw new Error("Partner account is not approved");
  }

  const partner = await tx.partnerProfile.findUnique({
    where: { id: partnerProfileId },
    select: { partnerType: true, workerLimit: true },
  });
  if (!partner) throw new Error("Partner profile not found");
  return partner;
};

export const associateWorker = async (
  partnerProfileId: string,
  workerProfileId: string
) =>
  prisma.$transaction(async (tx) => {
    const partner = await lockApprovedPartner(tx, partnerProfileId);
    const worker = await tx.workerProfile.findUnique({
      where: { id: workerProfileId },
      select: {
        id: true,
        partnerId: true,
        isVerified: true,
        isSuspended: true,
      },
    });

    if (!worker) throw new Error("Worker not found");
    if (!worker.isVerified) throw new Error("Worker is not verified");
    if (worker.isSuspended) throw new Error("Worker is suspended");
    if (worker.partnerId === partnerProfileId) {
      return tx.workerProfile.findUniqueOrThrow({
        where: { id: workerProfileId },
        select: customerWorkerSelect,
      });
    }
    if (worker.partnerId) {
      throw new Error("Worker is already associated with another Partner");
    }

    const currentCount = await tx.workerProfile.count({
      where: { partnerId: partnerProfileId },
    });
    const limit = effectivePartnerWorkerLimit(
      partner.partnerType as PartnerType,
      partner.workerLimit
    );
    if (limit !== null && currentCount >= limit) {
      throw new Error(`Partner worker limit of ${limit} has been reached`);
    }

    const updated = await tx.workerProfile.updateMany({
      where: {
        id: workerProfileId,
        partnerId: null,
        isVerified: true,
        isSuspended: false,
      },
      data: { partnerId: partnerProfileId },
    });

    if (updated.count !== 1) {
      throw new Error("Worker is no longer eligible for association");
    }

    return tx.workerProfile.findUniqueOrThrow({
      where: { id: workerProfileId },
      select: customerWorkerSelect,
    });
  });

export const removeAssociatedWorker = async (
  partnerProfileId: string,
  workerProfileId: string
) =>
  prisma.$transaction(async (tx) => {
    await lockApprovedPartner(tx, partnerProfileId);

    const removed = await tx.workerProfile.updateMany({
      where: { id: workerProfileId, partnerId: partnerProfileId },
      data: { partnerId: null },
    });

    if (removed.count !== 1) {
      throw new Error("Worker is not associated with this Partner");
    }

    return { workerProfileId, partnerId: null };
  });

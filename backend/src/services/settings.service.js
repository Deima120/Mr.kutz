/**
 * Settings Service - Configuración de la barbería (Prisma)
 */

import prisma from '../lib/prisma.js';

export const getSettings = async () => {
let settings = await prisma.businessSetting.findFirst({ where: { id: 1 } });
  if (!settings) {
    settings = await prisma.businessSetting.create({
      data: { id: 1, businessName: 'Mr. Kutz' },
    });
  }
  return {
    business_name: settings.businessName,
    logo_url: settings.logoUrl,
    primary_color: settings.primaryColor,
    secondary_color: settings.secondaryColor,
    contact_email: settings.contactEmail,
    contact_phone: settings.contactPhone,
    address: settings.address,
    opening_hours: settings.openingHours,
  };
};

export const updateSettings = async (data) => {
  const settings = await prisma.businessSetting.upsert({
    where: { id: 1 },
    update: {
      businessName: data.business_name,
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      address: data.address,
      openingHours: data.opening_hours,
    },
    create: {
      id: 1,
      businessName: data.business_name || 'Mr. Kutz',
      logoUrl: data.logo_url,
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      address: data.address,
      openingHours: data.opening_hours,
    },
  });
  return {
    business_name: settings.businessName,
    logo_url: settings.logoUrl,
    primary_color: settings.primaryColor,
    secondary_color: settings.secondaryColor,
    contact_email: settings.contactEmail,
    contact_phone: settings.contactPhone,
    address: settings.address,
    opening_hours: settings.openingHours,
  };
};

export const getPublicSettings = async () => {
  const settings = await prisma.businessSetting.findFirst({
    where: { id: 1 },
    select: {
      businessName: true,
      logoUrl: true,
      openingHours: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
    },
  });
  if (!settings) {
    return {
      business_name: 'Mr. Kutz',
      logo_url: null,
      opening_hours: null,
      contact_email: null,
      contact_phone: null,
      address: null,
    };
  }
  return {
    business_name: settings.businessName,
    logo_url: settings.logoUrl,
    opening_hours: settings.openingHours,
    contact_email: settings.contactEmail,
    contact_phone: settings.contactPhone,
    address: settings.address,
  };
};

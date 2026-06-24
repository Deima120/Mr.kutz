/**
 * Settings Service - Configuración de la barbería (Prisma)
 */

import prisma from '../lib/prisma.js';

export const getSettings = async () => {
let settings = await prisma.businessSetting.findFirst({ orderBy: { id: 'asc' } });
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

const DEFAULT_PUBLIC = {
  business_name: 'Mr. Kutz',
  logo_url: null,
  opening_hours: null,
  contact_email: null,
  contact_phone: null,
  address: null,
};

export const getPublicSettings = async () => {
  try {
    const settings = await prisma.businessSetting.findFirst({
      orderBy: { id: 'asc' },
      select: {
        businessName: true,
        logoUrl: true,
        openingHours: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
      },
    });
    if (!settings) return DEFAULT_PUBLIC;
    return {
      business_name: settings.businessName,
      logo_url: settings.logoUrl,
      opening_hours: settings.openingHours,
      contact_email: settings.contactEmail,
      contact_phone: settings.contactPhone,
      address: settings.address,
    };
  } catch (e) {
    console.error('[getPublicSettings]', e?.message || e);
    return DEFAULT_PUBLIC;
  }
};

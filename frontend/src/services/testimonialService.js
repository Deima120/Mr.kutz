/**
 * Testimonial API
 */

import api from './api';

const TESTIMONIALS_BASE = '/testimonials';

const extract = (r) => {
  const res = r?.data ?? r;
  return res?.data ?? res;
};

export const getTestimonials = async (params = {}) => {
  const response = await api.get(TESTIMONIALS_BASE, { params });
  return extract(response);
};

export const getTestimonialById = async (id) => {
  const response = await api.get(`${TESTIMONIALS_BASE}/${id}`);
  return extract(response);
};

export const createTestimonial = async (data) => {
  const response = await api.post(TESTIMONIALS_BASE, data);
  return extract(response);
};

export const updateTestimonial = async (id, data) => {
  const response = await api.put(`${TESTIMONIALS_BASE}/${id}`, data);
  return extract(response);
};

export const deleteTestimonial = async (id) => {
  await api.delete(`${TESTIMONIALS_BASE}/${id}`);
};

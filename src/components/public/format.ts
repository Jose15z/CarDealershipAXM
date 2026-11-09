export const money = (value: unknown) => value === null || value === undefined ? 'Consultar precio' : `$${Number(value).toLocaleString('es-CO')} COP`;
export const kilometers = (value: number | null) => value === null ? 'Por confirmar' : `${value.toLocaleString('es-CO')} km`;
export const whatsappUrl = (phone: string | null | undefined, message: string) => phone && /^57\d{10}$/.test(phone) ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
export const statusLabel: Record<string, string> = {DISPONIBLE:'Disponible',RESERVADO:'Reservado',VENDIDO:'Vendido',ARCHIVADO:'Archivado',DRAFT:'Borrador'};

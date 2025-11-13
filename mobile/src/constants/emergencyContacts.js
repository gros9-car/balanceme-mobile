export const emergencyContacts = [
  {
    id: 'linea-minsal',
    name: 'Linea Salud Mental MINSAL *4141',
    location: 'Cobertura nacional (desde celulares)',
    type: 'Prevencion del suicidio y crisis 24/7',
    action: { kind: 'phone', value: '*4141', label: 'Llamar *4141' },
  },
  {
    id: 'salud-responde',
    name: 'Salud Responde MINSAL',
    location: 'Cobertura nacional',
    type: 'Orientacion en salud y apoyo psicologico 24/7',
    action: { kind: 'phone', value: '6003607777', label: 'Llamar 600 360 7777' },
  },
  {
    id: 'emergencias-samu',
    name: 'Emergencias Medicas SAMU',
    location: 'Cobertura nacional',
    type: 'Servicios de emergencia medica general',
    action: { kind: 'phone', value: '131', label: 'Llamar 131' },
  },
  {
    id: 'emergencias-carabineros',
    name: 'Carabineros de Chile',
    location: 'Cobertura nacional',
    type: 'Emergencias de seguridad publica',
    action: { kind: 'phone', value: '133', label: 'Llamar 133' },
  },
  {
    id: 'linea-libre',
    name: 'Linea Libre Fono 1515 (INJUV)',
    location: 'Cobertura nacional',
    type: 'Apoyo psicologico para jovenes (lunes a sabado, 10:00 a 22:00 hrs)',
    action: { kind: 'phone', value: '1515', label: 'Llamar 1515' },
  },
  {
    id: 'quedate-cl',
    name: 'Programa quedate.cl',
    location: 'Red nacional (enfoque en Region Metropolitana)',
    type: 'Prevencion del suicidio y promocion de salud mental',
    action: { kind: 'web', value: 'https://www.quedate.cl', label: 'Abrir quedate.cl' },
  },
  {
    id: 'centros-salud',
    name: 'Centros de Salud Familiar (CESFAM)',
    location: 'Cobertura nacional',
    type: 'Atencion primaria y derivacion en salud mental (requiere inscripcion)',
    action: {
      kind: 'info',
      value:
        'Acercate al CESFAM mas cercano o llama a tu municipio para obtener informacion de contacto.',
      label: 'Ver indicaciones',
    },
  },
];

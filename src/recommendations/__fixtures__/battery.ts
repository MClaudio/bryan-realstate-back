/**
 * Batería de prueba con datos reales (anonimizados): 5 propiedades al azar y 50 clientes con interés.
 * Formulario de la propiedad tal como sale de la BD; clientes como "Cliente N".
 */
export const BATTERY_CITIES = [
  'Gualaceo',
  'Cuenca',
  'Chordeleg',
  'Paute',
  'Sigsig',
];

export interface BatteryProperty {
  codigo: string;
  tipo:
    | 'Terreno'
    | 'Casa'
    | 'Casa_y_terreno'
    | 'Departamento'
    | 'Finca'
    | 'Lote';
  ciudad: string;
  sector: string;
  direccion: string;
  terreno_m2: number;
  construccion_m2: number;
  topografia: 'Plano' | 'Semiplano' | 'Pendiente' | 'Mixto';
  zona: 'Urbano' | 'Rural' | 'Urbanizacion';
  servicios: string[];
  minutos_al_centro: number;
  precio_usd: number;
  caracteristicas: string;
  observaciones: string;
}

export const BATTERY_PROPERTIES: BatteryProperty[] = [
  {
    codigo: 'Gual-SectorBullzhun-53',
    tipo: 'Terreno',
    ciudad: 'Gualaceo',
    sector: 'Sector Bullzhun',
    direccion: 'Sector de Bullzhun',
    terreno_m2: 0,
    construccion_m2: 0,
    topografia: 'Mixto',
    zona: 'Rural',
    servicios: [],
    minutos_al_centro: 0,
    precio_usd: 76000,
    caracteristicas:
      'Propiedad en el sector de Bullzhun con excelente vista. con un area 4890 metros cuadrados para cualquier proyecto residencial, airbnb, etc. Con topografía mixta entre plana y semiplana, con fácil acceso a los servicios básicos. Puedes llegar por la via Bullzhun o Bullcay a la propiedad. Zona tranquila, mas conocida como la ruta de la Makana.',
    observaciones: '',
  },
  {
    codigo: 'Cuen-Ciudadeladelosingenieros-56',
    tipo: 'Casa',
    ciudad: 'Cuenca',
    sector: 'Ciudadela de los ingenieros',
    direccion: 'Ciudad de Cuenca ',
    terreno_m2: 260,
    construccion_m2: 270,
    topografia: 'Plano',
    zona: 'Urbano',
    servicios: ['Agua', 'Luz', 'Alcantarillado', 'Internet'],
    minutos_al_centro: 0,
    precio_usd: 258000,
    caracteristicas:
      'Casa residencial en la ciudadela de los ingenieros, zona exclusiva y tranquila. Zona urbana de la ciudad de Cuenca. con un área de terreno de 260 metros de terreno y 270 metros cuadrados de construcción. Ubicada en la ciudadela Martin Fierro a una cuadra de la Avenida Gonzáles Suarez y cruzando el rio se encuentra el Hospital del Río. Cerca de la casa podemos encontrar restaurantes, centro comerciales y universidades. La casa tiene dos plantas, contamos un patio para dos vehiculos. Primer piso tenemos un cuarto master completo. Una sala amplia con una pequeña zona verde bajo las escaleras, un baño social, un comedor y una cocina amoblada y con isla central. Desde la cocina y comedor se accede al patio posterior amplio con una zona de lavado y barbacoa. En la segunda planta tenemos una pequeña sala de estar, tres habitaciones amplias con su closet con un baño social completo compartido. Además de un cuarto de estudio que puede ser usado como otra habitación, y otra habitación master con baño privado y closet. La propiedad al estar dentro de una ciudadela cuenta con guardia de seguridad todos los días. Con todos los servicios básicos. Documentación al día.  ',
    observaciones: '',
  },
  {
    codigo: 'Chor-SectorPorrion-45',
    tipo: 'Casa',
    ciudad: 'Chordeleg',
    sector: 'Sector Porrion',
    direccion: 'Sector Porrion a 7 minutos del canton Chordeleg',
    terreno_m2: 4000,
    construccion_m2: 0,
    topografia: 'Plano',
    zona: 'Rural',
    servicios: ['Agua', 'Luz', 'Alcantarillado', 'Internet', 'Agua de Riego'],
    minutos_al_centro: 0,
    precio_usd: 255000,
    caracteristicas:
      'Quinta vacacional a 7 minutos del cantón Chordeleg. Ubicada en el sector de Porrión, con mas de 4000 metros cuadrados en una topografía plana en su gran mayoría. Además de una casa de una planta amplia. Sala, comedor y cocina en un solo ambiente y cuatro habitaciones, una con baño privada. Tiene también una cancha multifuncional. Además en la zona productiva tenemos dos piscinas como criadero de tilapias. Una área para criadero de aves y cuyes. Es un terreno muy productivo, con muchas plantas. Puede ser usada también para funcionar como un restaurante. Documentación al día. Lugar tranquilo y relajado',
    observaciones: '',
  },
  {
    codigo: 'Gual-entrecertagysanjose-31',
    tipo: 'Terreno',
    ciudad: 'Gualaceo',
    sector: 'Entre Certag y San José',
    direccion: 'Certag',
    terreno_m2: 3000,
    construccion_m2: 500,
    topografia: 'Mixto',
    zona: 'Urbano',
    servicios: ['Agua', 'Luz'],
    minutos_al_centro: 7,
    precio_usd: 120000,
    caracteristicas:
      'Propiedad con una nave industrial. A 8 minutos del centro de Gualaceo. Con un área total de 3000 metros cuadrados. La propiedad limite desde la vía principal hasta el río. En la propiedad se realizó algunos terraplanes para la construcción de la nave. La construcción se encuentra en obra gris que puede ser modificada a su gusto. En la vía asfaltada encontramos la parada de bus urbano que se dirige a Certag y este de regreso a Gualaceo. Cuenta con agua potable y luz eléctrica. Documentación lista para la venta. ',
    observaciones: 'actualmente esta una carpinteria ',
  },
  {
    codigo: 'cuencremig-0011',
    tipo: 'Casa',
    ciudad: 'Cuenca',
    sector: 'Av. Remigio Crespo Toral',
    direccion:
      'Ubicada a 2 cuadras de la Av Remigio Crespo exactamente en las calles Carchi y Morona ',
    terreno_m2: 185,
    construccion_m2: 150,
    topografia: 'Plano',
    zona: 'Urbano',
    servicios: [],
    minutos_al_centro: 0,
    precio_usd: 160000,
    caracteristicas:
      'Área 185 metros cuadrados. Casa en estado de remodelación,  perfecta para diseñarla a tu gusto. Para uso como vivienda familiar, departamentos u oficinas. Cuenta con todos los servicios básicos. Zona estratégica de la ciudad de Cuenca.',
    observaciones: '',
  },
];

export const BATTERY_CLIENTS: Record<string, string> = {
  'Cliente 1':
    'Busca casa con terreno fuera de la zona urbana de Gualaceo (si es posible todos los servicios básicos)',
  'Cliente 2': 'Interesada en un terreno en el sector de Sondeleg',
  'Cliente 3': 'Cliente de una casa que se vendió en Cuenca',
  'Cliente 4': 'Busca un terreno zona comercial en Cuenca',
  'Cliente 5': 'Busca una casa con terreno a las afueras de Gualaceo',
  'Cliente 6':
    'Busca casa en construcción de unos 150mil dólares en zona comercial',
  'Cliente 7':
    'Ella me compró un terreno hace dos años en el sector de bullcay',
  'Cliente 8': 'Busca casa rentable en Gualaceo',
  'Cliente 9': 'Busca terreno pequeños hasta de $45mil dólares en gualaceo',
  'Cliente 10': 'Dueña de la propiedad en el sector sanitario Cristóbal Paute',
  'Cliente 11': 'Representante de la Sra Rosa Lliguicota',
  'Cliente 12':
    'Busca un terreno en Chordeleg en el sector de zhio o en las cuadras',
  'Cliente 13':
    'Busca propiedad de más de 800 metros cuadrados en Nallig o alrededores de Gualaceo',
  'Cliente 14': 'Interesado en un terreno en el sector de Cazhalao',
  'Cliente 15':
    'Cliente que está vendiendo un terreno con nosotros en Bullzhun',
  'Cliente 16': 'Cliente que compró un a casa en sector de Nieves',
  'Cliente 17':
    'Le interesan invertir en una casa con terreno, y si la casa tiene departamentos mejor. Tiene que estar en gualaceo o en avenidas principales',
  'Cliente 18':
    'La Sra busca una casa comercial o de departamentos en una zona comercial en gualaceo',
  'Cliente 19':
    'Interesada en invertir en un terreno en el sector de tocteloma que se un área mayor  a 700m2 en Gualaceo',
  'Cliente 20':
    'Busca terrenos por los alrededores de Gualaceo hasta unos 60mil dólares',
  'Cliente 21':
    'Esta interesado en invertir en un terreno mayor  a 2000m2 con topografía plana  a unos 10minutos de gualaceo',
  'Cliente 22': 'Interesada de la propiedad en Tacapamba',
  'Cliente 23':
    'Busca una casa con terreno en las afueras de gualaceo el área del terreno debe ser mayor  a 1000m2',
  'Cliente 24':
    'Busca una casa en la zona urbana que este menor  a los $100mil dólares',
  'Cliente 25':
    'Busca una casa en las afueras de gualaceo más o menos  a unos 10 minutos de gualaceo',
  'Cliente 26':
    'Busca Un Terreno En la la comunidad de callazay en el cantón gualaceo que sea de una topografía plana o semi plana',
  'Cliente 27': 'Secretario de agua de riego sector Bullcay',
  'Cliente 28':
    'Esta interesado en invertir en terrenos grandes en el sector de Tarqui en Cuenca, mayor a 5 hectarias',
  'Cliente 29':
    'Busca una casa con poco terreno por las afueras de gualaceo de un presupuesto hasta unos $120mil dólares negociables',
  'Cliente 30':
    'El sr busca una casa o terreno de hasta unos $200mil pero en el centro de Paute',
  'Cliente 31':
    'Ella hace intercambio de dinero, ella recibe allá y nosotros aquí',
  'Cliente 32':
    'Interés en un terreno plano en Chordeleg.\n- Tipo de propiedad: Terreno\n- Ubicación: Chordeleg\n- Características: Plano',
  'Cliente 33':
    'Busca terreno cerca de zona urbana de Gualaceo mayor a 500 metros cuadrados',
  'Cliente 34':
    'El sr busca un terreno cerca  a las orillas del río San Francisco o una zona que sea plana con un área de terreno de 1000m2',
  'Cliente 35': 'Acabados en carpinteria',
  'Cliente 36': 'Busca casa comercial en el Centro de Cuenca l',
  'Cliente 37': 'Busca una casa comercial en Cuenca',
  'Cliente 38':
    'Busca terreno grande con un área de 1700m2 planos ya sea en gualaceo ochordeleg presupuesto hasta unos $80mil dólares',
  'Cliente 39': 'Interesada en invertir en una casa en Azogues o Guapan',
  'Cliente 40':
    'Interés en unos lotes en venta en Sucua.\n- Tipo de propiedad: Lotes\n- Operación: Venta\n- Ubicación: Sucua',
  'Cliente 41': 'Busca una casa con terreno en zona urbana de Gualaceo',
  'Cliente 42':
    'Esta cliente compró una casa en gualaceo en el sector del estadio',
  'Cliente 43': 'Dueña de casa vendida en Parculoma',
  'Cliente 44':
    'Busca una casa a las afueras de Gualaceo con un poco de terrenos',
  'Cliente 45':
    'Busca una casa en el centro de gualaceo con un presupuesto de $200mil dólares',
  'Cliente 46':
    'Busca una casa en construcción en la zona urbana comercial de Gualaceo',
  'Cliente 47': 'Asesor de créditos de cooperativa CB',
  'Cliente 48': 'Interesada en una casa en el centro de gualaceo',
  'Cliente 49':
    'Interesada busca terrenos grandes en el sector de Tarqui en Cuenca el terreno debe ser grande y no muy caro, más de 5 hectarias',
  'Cliente 50':
    'Busca terrenos grandes como para Hacienda en Cuenca que no sean muy caros',
};

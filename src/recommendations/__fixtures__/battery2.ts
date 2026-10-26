import type { BatteryProperty } from './battery';

/** Segunda batería real (anonimizada): otras 5 propiedades y 50 clientes con interés. */
export const BATTERY2_PROPERTIES: BatteryProperty[] = [
  {
    codigo: 'Cuen-AcuadraymediadelregistrocivildeSanBlas-60',
    tipo: 'Casa',
    ciudad: 'Cuenca',
    sector: 'A cuadra y media del registro civil de San Blas',
    direccion: 'Calle Manuel Angel Estrella y Alfonso Jerez',
    terreno_m2: 0,
    construccion_m2: 0,
    topografia: 'Plano',
    zona: 'Urbano',
    servicios: ['Agua', 'Luz', 'Alcantarillado', 'Internet'],
    minutos_al_centro: 0,
    precio_usd: 225000,
    caracteristicas:
      'Casa de dos plantas en el centro de Cuenca en la parroquia de San Blas a cuadra y media del registro civil de San Blas. Con un área de terreno de 204 metros cuadrados y 262 metros cuadrados de construcción. Al ingresar con recibe una amplia sala a lado tenemos al comedor separado por unas pequeña pared junto a el tenemos una cocina amoblada, dentro de la cocina tenemos un pequeño desayunador y un espacio amplio como un estudio. La casa tiene una segunda sala, que podría ser adaptada como otra habitación. Y para toda esta zona hay una baño social, en la parte trasera tenemos la zona de lavado y un área para compartir en familia. Además de una zona de barbacoa con un baño completo. Yuna zona verde con lindos jardines. En el segundo piso nos recibe una sala, tenemos la habitación principal con un balcón que da directo a la calle , y otra habitación con closet y otra mas con closet y mini sala, cada una con excelente luz, toda esta planta dispone de un baño completo. Antes era usada como departamentos. Cuenta todos los servicios básicos. Documentación al día.',
    observaciones: '',
  },
  {
    codigo: 'Gual-cercadeparquedelafamilia-27',
    tipo: 'Terreno',
    ciudad: 'Gualaceo',
    sector: 'Cerca del parque de la familia',
    direccion: 'Ubicada en la Av Santa Bárbara cerca del parque de la familia ',
    terreno_m2: 2480,
    construccion_m2: 0,
    topografia: 'Plano',
    zona: 'Urbano',
    servicios: [],
    minutos_al_centro: 2,
    precio_usd: 480000,
    caracteristicas:
      'Propiedad en zona urbana del cantón Gualaceo, con un área total de 2480 metros cuadrados, Una geografía plana, con perímetros marcados. Excelente opción si quieres lotizar. La propiedad dispone de 3 entradas. A media cuadra de la parada del bus urbano. Cuenta con facil acceso a todos los servicios básicos. Papeles listos para la venta. ',
    observaciones: 'cerca del cementerio ',
  },
  {
    codigo: 'Gual-SectorSanFranciscoBajo-50',
    tipo: 'Terreno',
    ciudad: 'Gualaceo',
    sector: 'Sector San Francisco Bajo',
    direccion: 'Sector San Francisco Bajo a la bajado de Zhiquil',
    terreno_m2: 0,
    construccion_m2: 0,
    topografia: 'Semiplano',
    zona: 'Urbano',
    servicios: [],
    minutos_al_centro: 0,
    precio_usd: 24000,
    caracteristicas:
      'Propiedad en el sector de San Francisco con una excelente vista a Gualaceo a 6 minutos del centro de Gualaceo. Con un área de 993 metros cuadrados con una topografía semiplana y un terreplan, puedes construir una casa residencial, una quinta vacacional o proyecto turístico. Para ingresar a la propiedad lo hacemos desde la vía a Zhiquil, esta vía conduce hacia el Oriente. Fácil acceso a los servicios básicos y acceso a la propiedad. Documentación al día.',
    observaciones: '',
  },
  {
    codigo: 'Gual-Cercadelafundaciónvidaylibertadydeltirofijo-35',
    tipo: 'Terreno',
    ciudad: 'Gualaceo',
    sector: 'Cerca de la fundación vida y libertad y del tiro fijo',
    direccion: 'Chiquintur ',
    terreno_m2: 630,
    construccion_m2: 0,
    topografia: 'Semiplano',
    zona: 'Urbano',
    servicios: ['Alcantarillado'],
    minutos_al_centro: 5,
    precio_usd: 59000,
    caracteristicas:
      'Propiedad en el sector de Chiquintur a 5min de Gualaceo cerca de la fundación vida y libertad. Con un área de 630 metros cuadrados, una topografía semiplana y plana en su gran mayoría, lista para tu proyecto de vivienda en una zona tranquila. Linderos delimitados. La propiedad colinda con la vía que va a San Juan y a pocos metros del centro de recepciones La Carreta. En la vía asfaltada puede tomar el bus urbano e Inter parroquial con fácil acceso al agua potable, luz eléctrica y derecho al alcantarillado. Documentación lista.',
    observaciones: '',
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

export const BATTERY2_CLIENTS: Record<string, string> = {
  'Cliente 1': 'Busca una casa comercial en zona urbana de Cuenca',
  'Cliente 2':
    'Interesado en un terreno amplio Mayor a 2000m2 en gualaceo que se plano para una bodega grande',
  'Cliente 3':
    'Busca Un Terreno En la la comunidad de callazay en el cantón gualaceo que sea de una topografía plana o semi plana',
  'Cliente 4': 'Busca terrenos en el sector de callazay en gualaceo',
  'Cliente 5':
    'Busca terrenos en las afueras de gualaceo hasta unos 8 minutos con un área mayor  a 1300m2 que sean planos',
  'Cliente 6': 'Asesor de créditos de cooperativa CB',
  'Cliente 7': 'Dispone de un tractor para trabajos',
  'Cliente 8':
    'Busca casa comercial con tienda o departamentos en centro se Gualaceo',
  'Cliente 9': 'Busca una casa en un lugar comercial en gualaceo',
  'Cliente 10':
    'Le interesa invertir en una casa en Cuenca que sea de departamentos',
  'Cliente 11':
    'Busca terreno de 1mil cuadrados en adelante junto a la vía principal asfaltada en Gualaceo',
  'Cliente 12':
    'Busca un terreno amplio para hacer una cancha de indor y que este junto a una vía principal en gualaceo',
  'Cliente 13':
    'Busca terreno grande con un área de 1700m2 planos ya sea en gualaceo ochordeleg presupuesto hasta unos $80mil dólares',
  'Cliente 14': 'Busca casas en el centro de Cuenca o Gualaceo',
  'Cliente 15':
    'Busca una casa en Cuenca ya sea para remodelar o una para Arbnb, rentar',
  'Cliente 16': 'Representante de Ismael Duchimaza',
  'Cliente 17':
    'La Sra busca una casa comercial o de departamentos en una zona comercial en gualaceo',
  'Cliente 18': 'Cliente que compró una propiedad en Chordeleg',
  'Cliente 19': 'Cliente que vendió con nosotros un terreno en chiquintur',
  'Cliente 20':
    'Busca terrenos más de 3mil metros cuadrados por Zhio Tamaute, Ramos',
  'Cliente 21': 'Busca una casa comercial en zona céntrica de Gualaceo',
  'Cliente 22':
    'Busca invertir en un terreno en el sector de capzha en gualaceo',
  'Cliente 23': 'Le interesan lotes pequeños hasta de unos $30mil dólares',
  'Cliente 24':
    'Interés en unos lotes en venta en Sucua.\n- Tipo de propiedad: Lotes\n- Operación: Venta\n- Ubicación: Sucua',
  'Cliente 25': 'Empresa de avalúos de la cooperativa JEP',
  'Cliente 26':
    'Busca casas comerciales en gualaceo y Chordelg y también terrenos por las mismas zonas',
  'Cliente 27': 'Busca terreno en el sector de pagran Gualaceo',
  'Cliente 28': 'Busca terrenos sector Nallig',
  'Cliente 29':
    'Busca terrenos en zonas comerciales en Cuenca por ejemplo la avenida las Américas',
  'Cliente 30':
    'Busca una casa o terreno en una zona comercial de Cuenca ya sea en el centro o en zonas de alto tráfico en Cuenca',
  'Cliente 31':
    'Busca terrenos grande junto a la vía principal. Hasta 90mil dólares',
  'Cliente 32':
    'Busca terrenos planos de 700m2 en adelante en gualaceo o a unos 5 minutos del centro de gualaceo',
  'Cliente 33': 'Dueño del terreno en el sector de Zio en chordeleg',
  'Cliente 34': 'Busca un terreno en Cuenca para construir',
  'Cliente 35':
    'Busca casa con terreno plano de más de 1mil 500 metros cuadrados no tan lejos de Gualaceo',
  'Cliente 36':
    'Busca propiedad de más de 800 metros cuadrados en Nallig o alrededores de Gualaceo',
  'Cliente 37':
    'Interés en terrenos en Chordeleg, por el centro o por Zhio.\n- Tipo de propiedad: Terrenos\n- Ubicación: Chordeleg, por el centro o por Zhio',
  'Cliente 38':
    'El es cliente, el nos compró un lote en el sector de el llano en gualaceo. Quiere vender un terreno en Cristo Rey gualaceo',
  'Cliente 39':
    'Busca una casa en gualaceo o una construcción para terminar en el centro de gualaceo, presupuesto $85mil dólares',
  'Cliente 40':
    'Busca casa con departamentos en Cuenca y tiene un presupuesto de hasta $150mil dólares',
  'Cliente 41': 'Busca una casa comercial en zona urbana de Gualaceo',
  'Cliente 42': 'Busca casa rentera en Cuenca',
  'Cliente 43':
    'Busca Terreno Con Frutales y con un área de máximo 1000metros en la zona de Gualaceo',
  'Cliente 44':
    'Le interésa invertir en una casa de campo ya sea en Paute o en gualaceo con un presupuesto de $75mil dólares',
  'Cliente 45':
    'El sr es presidente del GAD de la parroquia Luis Cordero Vega en Gualaceo',
  'Cliente 46':
    'Esta interesado en invertir en una casa en el centro de gualaceo',
  'Cliente 47': 'Asesor de créditos en el Banco del Austro',
  'Cliente 48': 'Busca ayuda con un proyecto de construcción',
  'Cliente 49': 'Comprador terreno esquinero De Pablo Sánchez',
  'Cliente 50':
    'Busca una casa con poco terreno por las afueras de gualaceo de un presupuesto hasta unos $120mil dólares negociables',
};

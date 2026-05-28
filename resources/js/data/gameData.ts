export type Ring = 'Plástico' | 'Agua' | 'Datos' | 'Energía' | 'Ropa';

export interface Role {
  id: string;
  name: string;
  specialist: string;
  ring: Ring | 'Todos';
  passiveDesc: string;
  activeDesc: string;
  activeCost: number;
  iconName: string;
}

export const RINGS: Ring[] = ['Plástico', 'Agua', 'Datos', 'Energía', 'Ropa'];

export const ROLES: Role[] = [
  {
    id: 'textil',
    name: 'Industria Textil',
    specialist: 'El Reciclador',
    ring: 'Ropa',
    passiveDesc: 'Reduce en 1 el coste de Eco-Tokens en Ropa.',
    activeDesc: 'Cerrar el Ciclo: Descarta el reto actual y extrae uno nuevo del mismo anillo.',
    activeCost: 3,
    iconName: 'Shirt'
  },
  {
    id: 'ciencia',
    name: 'Ciencia e I+D',
    specialist: 'El Innovador',
    ring: 'Todos',
    passiveDesc: 'Las cartas de Investigación no pueden ser bloqueadas.',
    activeDesc: 'Salto Tecnológico: Resuelve automáticamente el reto actual con éxito.',
    activeCost: 5,
    iconName: 'FlaskConical'
  },
  {
    id: 'tech',
    name: 'EcoTech',
    specialist: 'El Analista',
    ring: 'Datos',
    passiveDesc: 'Puede ver si el próximo turno tendrá un evento climático.',
    activeDesc: 'Algoritmo de Eficiencia: Reduce a la mitad el impacto de un evento.',
    activeCost: 2,
    iconName: 'Database'
  },
  {
    id: 'primario',
    name: 'Sector Primario',
    specialist: 'El Regenerador',
    ring: 'Agua',
    passiveDesc: 'Genera un escudo protector si la temperatura global sube.',
    activeDesc: 'Restauración de Ecosistemas: Baja la temperatura global en 0.2°C.',
    activeCost: 3,
    iconName: 'Sprout'
  },
  {
    id: 'legislativo',
    name: 'Sector Legislativo',
    specialist: 'El Regulador',
    ring: 'Energía',
    passiveDesc: 'Impuestos verdes: +1 Eco-Token extra al completar un reto.',
    activeDesc: 'Ley de Emergencia: Bloquea completamente el impacto de un evento activo.',
    activeCost: 4,
    iconName: 'Landmark'
  },
  {
    id: 'ciudadania',
    name: 'Ciudadanía',
    specialist: 'El Motor Social',
    ring: 'Plástico',
    passiveDesc: 'Genera 2 Eco-Tokens adicionales cada turno.',
    activeDesc: 'Presión Social: Elimina la mitad de las opciones incorrectas del reto actual.',
    activeCost: 2,
    iconName: 'Users'
  },
];

export interface Challenge {
  ring: Ring;
  question: string;
  options: string[];
  answer: number;
}

export const CHALLENGES: Challenge[] = [
  // Plástico
  { ring: 'Plástico', question: '¿Cuánto tiempo tarda una botella de plástico en degradarse?', options: ['100 años', '500 años', '1000 años', 'No se degrada, se hace microplástico'], answer: 3 },
  { ring: 'Plástico', question: '¿Cuál es el mejor método para reducir la contaminación por plástico?', options: ['Reciclar más', 'Quemar el plástico', 'Reducir el consumo de plásticos de un solo uso', 'Enterrarlo'], answer: 2 },
  { ring: 'Plástico', question: '¿Qué porcentaje del plástico mundial se recicla realmente?', options: ['Menos del 10%', 'Alrededor del 30%', 'Cerca del 50%', 'Más del 80%'], answer: 0 },
  // Agua
  { ring: 'Agua', question: '¿Cuánta agua dulce hay disponible para consumo humano en la Tierra?', options: ['10%', '5%', 'Menos del 1%', '25%'], answer: 2 },
  { ring: 'Agua', question: '¿Qué sector consume la mayor cantidad de agua a nivel mundial?', options: ['Uso doméstico', 'Industria', 'Agricultura', 'Generación de energía'], answer: 2 },
  { ring: 'Agua', question: '¿Qué es la "huella hídrica"?', options: ['El agua que bebemos al día', 'El volumen total de agua dulce usada para producir bienes y servicios', 'El agua que se evapora', 'La marca que deja el agua en la tierra'], answer: 1 },
  // Datos
  { ring: 'Datos', question: '¿Qué impacto tiene enviar un correo electrónico con un archivo adjunto grande?', options: ['Ninguno', 'Equivale a dejar una bombilla encendida 1 hora', 'Equivale a conducir 1 km', 'Equivale a hervir agua para un té'], answer: 1 },
  { ring: 'Datos', question: '¿Cómo se puede reducir la huella de carbono digital?', options: ['Apagando la pantalla', 'Borrando correos antiguos y cancelando suscripciones', 'Usando modo oscuro', 'Escribiendo más rápido'], answer: 1 },
  { ring: 'Datos', question: '¿Qué porcentaje de las emisiones globales de gases de efecto invernadero proviene del sector TIC?', options: ['0.5%', 'Entre 2% y 4%', '10%', '20%'], answer: 1 },
  // Energía
  { ring: 'Energía', question: '¿Cuál de estas es una fuente de energía renovable?', options: ['Carbón', 'Gas Natural', 'Geotérmica', 'Energía Nuclear'], answer: 2 },
  { ring: 'Energía', question: '¿Qué es la eficiencia energética?', options: ['Usar menos energía para realizar la misma tarea', 'Apagar todo', 'Usar solo paneles solares', 'Producir más energía'], answer: 0 },
  { ring: 'Energía', question: '¿Cuál es el principal gas de efecto invernadero emitido por la quema de combustibles fósiles?', options: ['Metano', 'Óxido nitroso', 'Dióxido de carbono (CO2)', 'Ozono'], answer: 2 },
  // Ropa
  { ring: 'Ropa', question: '¿Cuántos litros de agua se necesitan aproximadamente para fabricar unos pantalones vaqueros?', options: ['100 litros', '1,000 litros', '7,500 litros', '20,000 litros'], answer: 2 },
  { ring: 'Ropa', question: '¿Qué es el "Fast Fashion" (Moda Rápida)?', options: ['Ropa para correr', 'Producción masiva de ropa barata y de baja calidad', 'Ropa que se seca rápido', 'Ropa hecha a medida rápidamente'], answer: 1 },
  { ring: 'Ropa', question: '¿Cuál es la mejor forma de reducir el impacto ambiental de tu ropa?', options: ['Comprar ropa nueva cada mes', 'Lavar la ropa con agua caliente', 'Comprar de segunda mano y reparar la ropa', 'Tirar la ropa a la basura normal'], answer: 2 },
];

export interface EventCard {
  title: string;
  description: string;
  penalty: number;
}

export const EVENTS: EventCard[] = [
  { title: 'Ola de Calor Extrema', description: 'Aumenta la demanda de energía y evapora reservas de agua.', penalty: 0.1 },
  { title: 'Fuga de Datos Masiva', description: 'Los servidores trabajan al 200%, disparando el consumo energético.', penalty: 0.1 },
  { title: 'Vertido de Microplásticos', description: 'Contaminación severa en los océanos.', penalty: 0.1 },
  { title: 'Sequía Prolongada', description: 'El sector primario sufre pérdidas masivas.', penalty: 0.1 },
  { title: 'Boom del Fast Fashion', description: 'Aumento descontrolado de residuos textiles.', penalty: 0.1 },
];

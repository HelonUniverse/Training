import { Teaching } from './types';

export const teachings: Teaching[] = [
  {
    id: 't-silencio',
    title: 'El silencio también es una respuesta',
    subtitle: 'Sobre lo que aprendemos cuando dejamos de exigirle palabras a la vida',
    theme: 'Silencio',
    image: 'teaching-silence',
    authorId: 'g-amara',
    readMinutes: 6,
    listenMinutes: 8,
    publishedOn: 'Hoy',
    featured: true,
    excerpt:
      'Hay preguntas que no se contestan: se habitan. Lo que llamamos silencio casi nunca es ausencia, es una forma más lenta de ser respondido.',
    tags: ['contemplación', 'escucha', 'duelo'],
    body: [
      {
        kind: 'paragraph',
        text: 'Llevas semanas preguntando. Has preguntado en voz alta, en la almohada, en el auto detenido frente al semáforo. Y no ha llegado nada. Ninguna señal, ninguna certeza, ningún golpe de claridad. Solo el mismo silencio de siempre.',
      },
      {
        kind: 'paragraph',
        text: 'Nos enseñaron a leer ese silencio como abandono. Como si la vida estuviera obligada a contestar en el idioma que nosotros elegimos y en el plazo que nosotros fijamos. Pero el silencio rara vez es un no. Casi siempre es un todavía no, y a veces —las más difíciles— es un ya te contesté, solo que no querías escucharlo así.',
      },
      { kind: 'verse', text: 'Lo que no responde con palabras\nte está respondiendo con tiempo.' },
      {
        kind: 'subtitle',
        text: 'La diferencia entre el vacío y el espacio',
      },
      {
        kind: 'paragraph',
        text: 'El vacío es lo que sentimos cuando esperamos algo que no llega. El espacio es lo que aparece cuando dejamos de esperarlo. Son el mismo lugar visto desde dos posturas distintas del alma. Nadie puede pasar del uno al otro por decisión, pero sí por práctica.',
      },
      {
        kind: 'paragraph',
        text: 'La práctica es sencilla y brutal: quedarte. No arreglar el silencio con ruido, no llenarlo con explicaciones, no salir corriendo a pedir opinión. Quedarte los primeros diez minutos, que son los peores. Después de los diez, algo cede.',
      },
      {
        kind: 'subtitle',
        text: 'Una práctica para esta semana',
      },
      {
        kind: 'paragraph',
        text: 'Cada mañana, antes de tomar el teléfono, siéntate cinco minutos con la pregunta que más te pesa. No la respondas. No la analices. Solo sostenla, como se sostiene a alguien que llora. Al séptimo día, escribe qué cambió: no en la respuesta, sino en ti.',
      },
      {
        kind: 'verse',
        text: 'No estás esperando una señal.\nEstás aprendiendo a reconocerla.',
      },
    ],
  },
  {
    id: 't-luz',
    title: 'La luz que entra por lo roto',
    subtitle: 'Por qué las grietas no son el fracaso del alma sino su arquitectura',
    theme: 'Luz',
    image: 'teaching-light',
    authorId: 'g-idris',
    readMinutes: 7,
    listenMinutes: 9,
    publishedOn: 'Ayer',
    excerpt:
      'Nadie construye una catedral sin ventanas. Lo que en tu historia parece daño estructural puede ser, visto de cerca, el lugar exacto por donde entra la claridad.',
    tags: ['sombra', 'sanación', 'aceptación'],
    body: [
      {
        kind: 'paragraph',
        text: 'Hay una idea muy difundida de que la persona sana es la persona sin grietas. Que primero hay que repararse y después vivir. Con esa idea se pierden décadas enteras.',
      },
      {
        kind: 'paragraph',
        text: 'Pero mira una catedral. Su fuerza no está en el muro cerrado: está en cómo distribuye el peso alrededor de sus aberturas. Las ventanas no debilitan el edificio, lo definen. Y son, por supuesto, lo único por donde entra la luz.',
      },
      { kind: 'verse', text: 'Lo que en ti se abrió\nno se abrió en tu contra.' },
      {
        kind: 'subtitle',
        text: 'La diferencia entre herida y grieta',
      },
      {
        kind: 'paragraph',
        text: 'Una herida pide atención inmediata; una grieta pide arquitectura. Confundirlas es el error más común. Si tratas una grieta antigua como una herida fresca, vivirás en emergencia permanente. Si tratas una herida fresca como una grieta antigua, te vas a acostumbrar a sangrar.',
      },
      {
        kind: 'paragraph',
        text: 'La pregunta honesta no es "¿qué me rompió?" sino "¿qué se está sosteniendo alrededor de esto?". Casi siempre descubrirás que has construido más de lo que creías.',
      },
      {
        kind: 'verse',
        text: 'No eres el derrumbe.\nEres lo que quedó en pie.',
      },
    ],
  },
  {
    id: 't-agua',
    title: 'Agua que recuerda su cauce',
    subtitle: 'Volver a lo esencial sin romantizar el pasado',
    theme: 'Retorno',
    image: 'teaching-water',
    authorId: 'g-neve',
    readMinutes: 5,
    listenMinutes: 6,
    publishedOn: 'Hace 3 días',
    excerpt:
      'Volver no es retroceder. El agua que regresa al cauce no está deshaciendo su viaje: está recordando su forma.',
    tags: ['retorno', 'identidad'],
    body: [
      {
        kind: 'paragraph',
        text: 'Hay épocas en las que uno se desconoce. No por una crisis dramática, sino por acumulación: decisiones pequeñas, sí dichos por costumbre, semanas que se parecen demasiado entre sí.',
      },
      {
        kind: 'paragraph',
        text: 'El agua tiene una inteligencia que nosotros perdimos: cuando se desborda, no se avergüenza. Busca el terreno más bajo y vuelve. No hay culpa en su regreso, solo gravedad.',
      },
      { kind: 'verse', text: 'Volver a ti no es retroceder.\nEs dejar de ir en contra de tu propio peso.' },
      {
        kind: 'paragraph',
        text: 'Pregúntate esta semana: ¿en qué parte de mi vida estoy subiendo una cuesta que nadie me pidió subir?',
      },
    ],
  },
  {
    id: 't-umbral',
    title: 'Quedarse en el umbral',
    subtitle: 'La sabiduría de no cruzar todavía',
    theme: 'Umbral',
    image: 'teaching-threshold',
    authorId: 'g-neve',
    readMinutes: 8,
    listenMinutes: 10,
    publishedOn: 'Hace 5 días',
    excerpt:
      'Toda cultura antigua tuvo ritos de umbral porque sabía algo que nosotros olvidamos: cruzar sin preparación no es valentía, es desperdicio.',
    tags: ['transiciones', 'ritos'],
    body: [
      {
        kind: 'paragraph',
        text: 'Un umbral no es un obstáculo. Es un lugar. Tiene su propia duración, sus propias reglas y su propia dignidad.',
      },
      {
        kind: 'paragraph',
        text: 'La prisa moderna nos convenció de que la incertidumbre es un problema a resolver rápido. Por eso tomamos decisiones grandes en estados pequeños: cansados, asustados, apurados.',
      },
      { kind: 'verse', text: 'No toda puerta se cruza el día que se abre.' },
      {
        kind: 'subtitle',
        text: 'Tres señales de que aún no es tiempo',
      },
      {
        kind: 'paragraph',
        text: 'Primera: la decisión te alivia más de lo que te alegra. Segunda: necesitas convencer a alguien más antes que a ti. Tercera: solo puedes sostenerla cuando estás enojado.',
      },
    ],
  },
  {
    id: 't-raiz',
    title: 'Lo que la raíz sabe del invierno',
    subtitle: 'Sobre los tiempos donde no hay nada visible que mostrar',
    theme: 'Raíz',
    image: 'teaching-roots',
    authorId: 'g-amara',
    readMinutes: 6,
    listenMinutes: 7,
    publishedOn: 'Hace una semana',
    excerpt:
      'El árbol en enero no está fracasando. Está haciendo, bajo tierra, el trabajo que en abril llamaremos florecer.',
    tags: ['paciencia', 'ciclos'],
    body: [
      {
        kind: 'paragraph',
        text: 'Medimos nuestra vida por lo que se ve. Y hay temporadas largas en las que no se ve nada: ni resultados, ni claridad, ni progreso medible.',
      },
      {
        kind: 'paragraph',
        text: 'Bajo tierra, sin embargo, ocurre casi todo lo importante. La raíz no pide aplausos porque no los necesita para trabajar.',
      },
      { kind: 'verse', text: 'Hay meses de tu vida\nque solo se entienden años después.' },
    ],
  },
  {
    id: 't-aliento',
    title: 'El aliento como primera oración',
    subtitle: 'Una práctica de cinco minutos que sí vas a sostener',
    theme: 'Respiración',
    image: 'teaching-breath',
    authorId: 'g-tobias',
    readMinutes: 4,
    listenMinutes: 6,
    publishedOn: 'Hace una semana',
    excerpt:
      'Antes de cualquier tradición, de cualquier libro y de cualquier maestro, estuvo esto: alguien respirando con atención.',
    tags: ['respiración', 'cuerpo', 'práctica'],
    body: [
      {
        kind: 'paragraph',
        text: 'Tu sistema nervioso no entiende argumentos. Entiende ritmo. Por eso puedes saber perfectamente que estás a salvo y seguir temblando.',
      },
      {
        kind: 'paragraph',
        text: 'La exhalación larga es la única palanca voluntaria que tienes sobre un sistema involuntario. Cuatro tiempos al inhalar, ocho al exhalar. Cinco minutos.',
      },
      { kind: 'verse', text: 'Respirar despacio\nes decirle al cuerpo que ya pasó.' },
    ],
  },
  {
    id: 't-fuego',
    title: 'El fuego que no consume',
    subtitle: 'Distinguir el deseo que da vida del que solo quema',
    theme: 'Fuego',
    image: 'teaching-fire',
    authorId: 'g-lucia',
    readMinutes: 5,
    listenMinutes: 7,
    publishedOn: 'Hace 10 días',
    excerpt:
      'No todo lo que arde te está destruyendo, y no todo lo que te calienta te está cuidando. Aprender a distinguirlos es trabajo de años.',
    tags: ['deseo', 'vocación'],
    body: [
      {
        kind: 'paragraph',
        text: 'Hay un fuego que ilumina la habitación y otro que la deja en cenizas. Ambos se sienten cálidos al principio.',
      },
      {
        kind: 'paragraph',
        text: 'La prueba no está en la intensidad, sino en lo que queda al día siguiente: ¿tienes más vida o menos?',
      },
      { kind: 'verse', text: 'Lo que te enciende sin agotarte\nes probablemente tu camino.' },
    ],
  },
  {
    id: 't-retorno',
    title: 'Regresar sin pedir perdón',
    subtitle: 'Sobre volver a una práctica que abandonaste',
    theme: 'Retorno',
    image: 'teaching-return',
    authorId: 'g-idris',
    readMinutes: 5,
    listenMinutes: 6,
    publishedOn: 'Hace 2 semanas',
    excerpt:
      'Dejaste de meditar, de escribir, de rezar, de moverte. Volviste a intentarlo tres veces. La cuarta también cuenta.',
    tags: ['constancia', 'compasión'],
    body: [
      {
        kind: 'paragraph',
        text: 'La culpa es un pésimo motor. Enciende rápido y se apaga antes de llegar a ninguna parte.',
      },
      {
        kind: 'paragraph',
        text: 'Volver sin ceremonia es una habilidad espiritual seria: sentarte hoy sin rendir cuentas por los cuarenta días que no te sentaste.',
      },
      { kind: 'verse', text: 'La práctica no lleva registro de tus ausencias.\nSolo de tu presencia.' },
    ],
  },
];

export const featuredTeaching = teachings.find((t) => t.featured) ?? teachings[0];

export const findTeaching = (id: string | undefined) => teachings.find((t) => t.id === id);

export const teachingThemes = Array.from(new Set(teachings.map((t) => t.theme)));

import { PrismaClient, PhotoSource } from '@prisma/client'

const prisma = new PrismaClient()

const seedProducts = [
  {
    id: 'classic-meringue',
    category: 'Меренговые рулеты',
    name: 'Классическая меренга',
    description: 'Воздушный рулет с мягким сливочным вкусом.',
    inside: 'Меренга, сливочно-фисташковый крем, малиновый конфитюр.',
    decor: 'Ягоды, кремовые волны и шоколадная крошка.',
    price: '1600 ₽'
  },
  {
    id: 'orange-cinnamon',
    category: 'Меренговые рулеты',
    name: 'Апельсин и корица',
    description: 'Сбалансированный цитрусовый вкус с пряной нотой.',
    inside: 'Меренга, сливочный крем, апельсиновый слой, корица.',
    decor: 'Цедра апельсина, сливочный крем.',
    price: '1700 ₽'
  },
  {
    id: 'coffee-cherry',
    category: 'Меренговые рулеты',
    name: 'Кофе и вишня',
    description: 'Насыщенный десерт с кофейным акцентом и ягодной кислинкой.',
    inside: 'Меренга, кофейный крем, вишневый конфитюр.',
    decor: 'Крем-чиз, вяленая вишня, шоколадный декор.',
    price: '1700 ₽'
  },
  {
    id: 'pistachio-raspberry',
    category: 'Меренговые рулеты',
    name: 'Фисташка и малина',
    description: 'Фирменный рулет с яркой малиновой кислинкой.',
    inside: 'Меренга, сливочно-фисташковый крем, малиновый конфитюр.',
    decor: 'Фисташковая крошка, свежие ягоды.',
    price: '1900 ₽'
  },
  {
    id: 'berry-mix',
    category: 'Меренговые рулеты',
    name: 'Ягодный микс',
    description: 'Легкий десерт со свежим ягодным вкусом.',
    inside: 'Меренга, сливочный крем, микс ягод.',
    decor: 'Сезонные ягоды, малиновый соус.',
    price: '1700 ₽'
  },
  {
    id: 'marble-currant',
    category: 'Меренговые рулеты',
    name: 'Мрамор — черная смородина',
    description: 'Контрастный рулет с плотным ягодным вкусом.',
    inside: 'Меренга, крем-чиз, пюре черной смородины.',
    decor: 'Мраморный узор из темного шоколада и крем-чиз.',
    price: '1900 ₽'
  },
  {
    id: 'potato-cake',
    category: 'Дополнительные позиции',
    name: 'Пирожное «Картошка в шоколаде»',
    description: 'Набор из 9 пирожных для подарка и семейного чаепития.',
    inside: 'Шоколадный бисквит, шоколадное покрытие.',
    decor: 'Дробленый фундук и сублимированная клубника.',
    price: '800 ₽ (9 шт.)'
  },
  {
    id: 'zephyr-curls-15',
    category: 'Зефир — коробки',
    name: 'Квадратная коробочка завитков (15×15)',
    description: 'Нежный набор зефира в компактной коробке.',
    inside: 'Домашний зефир на фруктовом пюре.',
    decor: 'Фигурные завитки в цветах бренда.',
    price: '500 ₽'
  },
  {
    id: 'zephyr-tulips-20',
    category: 'Зефир — коробки',
    name: 'Квадратная коробочка тюльпанов (20×20)',
    description: 'Подарочная коробка зефира в форме тюльпанов.',
    inside: 'Зефир на ягодном пюре.',
    decor: 'Тюльпаны ручной работы.',
    price: '1500 ₽'
  },
  {
    id: 'zephyr-round-tulips',
    category: 'Зефир — коробки',
    name: 'Круглая коробочка с тюльпанами',
    description: 'Круглый подарочный набор с цветочным оформлением.',
    inside: 'Зефир ручной работы.',
    decor: 'Тюльпаны в пастельных оттенках.',
    price: '1800 ₽'
  },
  {
    id: 'zephyr-round-roses',
    category: 'Зефир — коробки',
    name: 'Круглая коробочка с розами',
    description: 'Премиальный цветочный набор для подарка.',
    inside: 'Воздушный зефир из натуральных ингредиентов.',
    decor: 'Розы ручной работы.',
    price: '2000 ₽'
  },
  {
    id: 'zephyr-round-mix',
    category: 'Зефир — коробки',
    name: 'Круглая коробочка тюльпаны + розы',
    description: 'Смешанный цветочный набор в круглой коробке.',
    inside: 'Зефир с натуральным вкусом.',
    decor: 'Тюльпаны и розы ручной работы.',
    price: '2000 ₽'
  },
  {
    id: 'zephyr-bouquet-18',
    category: 'Зефир — букеты',
    name: 'Букет 18 см',
    description: 'Компактный букет из зефира для небольшого подарка.',
    inside: 'Зефир из натурального фруктового пюре.',
    decor: 'Ручная флористическая сборка.',
    price: '1800 ₽'
  },
  {
    id: 'zephyr-bouquet-20',
    category: 'Зефир — букеты',
    name: 'Букет 20 см',
    description: 'Сбалансированный размер букета для поздравления.',
    inside: 'Нежный домашний зефир.',
    decor: 'Цветочная композиция ручной работы.',
    price: '1900 ₽'
  },
  {
    id: 'zephyr-bouquet-22',
    category: 'Зефир — букеты',
    name: 'Букет 22 см',
    description: 'Пышный букет с акцентом на форму и объем.',
    inside: 'Зефир на натуральном пюре.',
    decor: 'Тюльпаны и розы из зефира.',
    price: '2000 ₽'
  },
  {
    id: 'zephyr-bouquet-24',
    category: 'Зефир — букеты',
    name: 'Букет 24 см',
    description: 'Большой праздничный букет из зефира.',
    inside: 'Авторский домашний зефир.',
    decor: 'Плотная цветочная композиция.',
    price: '2500 ₽'
  },
  {
    id: 'zephyr-bouquet-26',
    category: 'Зефир — букеты',
    name: 'Букет 26 см',
    description: 'Максимальный размер букета для торжественного случая.',
    inside: 'Натуральный зефир ручной работы.',
    decor: 'Премиальная цветочная сборка.',
    price: '3000 ₽'
  }
]

const seedReviews = [
  {
    name: 'Анна',
    phone: null,
    text: 'Заказывала рулет «Фисташка и малина». Вкус очень нежный, оформление аккуратное, доставили вовремя.',
    rating: 5
  },
  {
    name: 'Марина',
    phone: null,
    text: 'Букет из зефира выглядел как живые цветы. Отличный вариант подарка, все свежее и красивое.',
    rating: 5
  },
  {
    name: 'Ирина',
    phone: null,
    text: 'Нравится индивидуальный подход: помогли выбрать декор и вкус под мероприятие.',
    rating: 5
  }
]

const ttkBySlug = {
  'marble-currant': { proteins: '7.5 г', fats: '25 г', carbs: '60 г', kcal: '490' },
  'classic-meringue': { proteins: '6 г', fats: '11 г', carbs: '58 г', kcal: '360' },
  'orange-cinnamon': { proteins: '7.5 г', fats: '24 г', carbs: '59 г', kcal: '480' },
  'coffee-cherry': { proteins: '7.5 г', fats: '22 г', carbs: '52 г', kcal: '430' },
  'cherry-classic': { proteins: '6 г', fats: '18 г', carbs: '46 г', kcal: '370' }
}

const photoSeedList = [
  {
    file: 'MERENGOVYJ_RULET_MRAMOR-CHYORNAYA_SMORODINA.png',
    title: 'Меренговый рулет мрамор — черная смородина',
    dessertSlug: 'marble-currant',
    inGallery: true
  },
  {
    file: 'Merengovyj_rulet_Fistashka-malina2.png',
    title: 'Меренговый рулет фисташка-малина',
    dessertSlug: 'pistachio-raspberry',
    inGallery: true
  },
  {
    file: 'Merengovyj_rulet_fistashka-malina.png',
    title: 'Меренговый рулет фисташка-малина',
    dessertSlug: 'pistachio-raspberry',
    inGallery: true
  },
  {
    file: 'Kartoshka_v_shokolade.png',
    title: 'Картошка в шоколаде',
    dessertSlug: 'potato-cake',
    inGallery: true
  },
  {
    file: 'Klubnichnyj_Merengovyj_rulet.png',
    title: 'Клубничный меренговый рулет',
    dessertSlug: null,
    inGallery: true
  },
  {
    file: 'Zefir_4x4.png',
    title: 'Зефир',
    dessertSlug: null,
    inGallery: true
  },
  {
    file: 'Zefir_8x2.png',
    title: 'Зефир',
    dessertSlug: null,
    inGallery: true
  },
  {
    file: 'Zefir_kruglaya_korobka.png',
    title: 'Зефир круглая коробка',
    dessertSlug: null,
    inGallery: true
  },
  {
    file: 'obrabotka-deserta-13-mar-2026-9.png',
    title: 'Десерт',
    dessertSlug: null,
    inGallery: true
  }
]

const inferLeadTimeHours = (category) => {
  if (category.includes('Меренговые')) {
    return 48
  }
  if (category.includes('Зефир')) {
    return 72
  }
  return null
}

async function main() {
  const dessertsCount = await prisma.dessert.count()
  if (dessertsCount > 0) {
    console.log('Seed skipped: desserts already exist.')
    return
  }

  const dessertIdBySlug = new Map()

  for (const product of seedProducts) {
    const ttk = ttkBySlug[product.id]
    const created = await prisma.dessert.create({
      data: {
        slug: product.id,
        category: product.category,
        name: product.name,
        description: product.description,
        inside: product.inside,
        decor: product.decor,
        price: product.price,
        leadTimeHours: inferLeadTimeHours(product.category),
        ttkProteins: ttk?.proteins || null,
        ttkFats: ttk?.fats || null,
        ttkCarbs: ttk?.carbs || null,
        ttkKcal: ttk?.kcal || null,
        active: true
      }
    })

    dessertIdBySlug.set(product.id, created.id)
  }

  await prisma.photo.createMany({
    data: photoSeedList.map((item) => ({
      path: `/uploads/seed/${item.file}`,
      title: item.title,
      inGallery: item.inGallery,
      source: PhotoSource.seed,
      dessertId: item.dessertSlug ? dessertIdBySlug.get(item.dessertSlug) || null : null
    }))
  })

  await prisma.review.createMany({
    data: seedReviews.map((review) => ({
      name: review.name,
      phone: review.phone,
      text: review.text,
      rating: review.rating,
      approved: true
    }))
  })

  console.log('Seed completed successfully.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

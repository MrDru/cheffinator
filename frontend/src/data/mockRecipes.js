// Mock recipes for local development and demo purposes
// Only imported in development mode to reduce production bundle size

export const MOCK_RECIPES = [
  {
    id: 'mock-1',
    name: 'Classic Shakshuka',
    description: 'A delicious Middle Eastern dish of poached eggs in spiced tomato sauce',
    servings: 4,
    tags: ['Israeli', 'Breakfast', 'Vegetarian', 'Easy'],
    ingredients: [
      { id: 1, name: 'Tomatoes', amount: '400', unit: 'g' },
      { id: 2, name: 'Eggs', amount: '4', unit: 'piece' },
      { id: 3, name: 'Onion', amount: '1', unit: 'piece' },
      { id: 4, name: 'Cumin', amount: '1', unit: 'tsp' }
    ],
    stages: [
      { id: 1, text: 'Sauté diced onion until golden' },
      { id: 2, text: 'Add crushed tomatoes and spices, simmer for 10 minutes' },
      { id: 3, text: 'Make wells and crack eggs, cover and cook until set' }
    ],
    variations: [
      {
        id: 'mock-1-v1',
        name: 'Original',
        description: 'A delicious Middle Eastern dish of poached eggs in spiced tomato sauce',
        servings: 4,
        tags: ['Israeli', 'Breakfast', 'Vegetarian', 'Easy'],
        ingredients: [
          { id: 1, name: 'Tomatoes', amount: '400', unit: 'g' },
          { id: 2, name: 'Eggs', amount: '4', unit: 'piece' },
          { id: 3, name: 'Onion', amount: '1', unit: 'piece' },
          { id: 4, name: 'Cumin', amount: '1', unit: 'tsp' }
        ],
        stages: [
          { id: 1, text: 'Sauté diced onion until golden' },
          { id: 2, text: 'Add crushed tomatoes and spices, simmer for 10 minutes' },
          { id: 3, text: 'Make wells and crack eggs, cover and cook until set' }
        ]
      },
      {
        id: 'mock-1-v2',
        name: 'Spicy',
        description: 'Shakshuka with extra heat from jalapeños and harissa',
        servings: 4,
        tags: ['Israeli', 'Breakfast', 'Vegetarian', 'Spicy'],
        ingredients: [
          { id: 1, name: 'Tomatoes', amount: '400', unit: 'g' },
          { id: 2, name: 'Eggs', amount: '4', unit: 'piece' },
          { id: 3, name: 'Jalapeño', amount: '2', unit: 'piece' },
          { id: 4, name: 'Harissa paste', amount: '2', unit: 'tbsp' }
        ],
        stages: [
          { id: 1, text: 'Sauté jalapeños until softened' },
          { id: 2, text: 'Add tomatoes, harissa, and spices - simmer 10 minutes' },
          { id: 3, text: 'Make wells, crack eggs, cover and cook until set' }
        ]
      }
    ],
    updated: 'Dec 2024',
    isMock: true
  },
  {
    id: 'mock-2',
    name: 'Creamy Pasta Primavera',
    description: 'Fresh vegetables in a light cream sauce over pasta',
    servings: 6,
    tags: ['Italian', 'Pasta', 'Vegetarian', 'Dinner'],
    ingredients: [
      { id: 1, name: 'Penne pasta', amount: '500', unit: 'g' },
      { id: 2, name: 'Heavy cream', amount: '250', unit: 'ml' },
      { id: 3, name: 'Mixed vegetables', amount: '300', unit: 'g' },
      { id: 4, name: 'Parmesan', amount: '100', unit: 'g' }
    ],
    stages: [
      { id: 1, text: 'Cook pasta according to package directions' },
      { id: 2, text: 'Sauté vegetables until tender-crisp' },
      { id: 3, text: 'Add cream and parmesan, toss with pasta' }
    ],
    variations: [
      {
        id: 'mock-2-v1',
        name: 'Original',
        description: 'Fresh vegetables in a light cream sauce over pasta',
        servings: 6,
        tags: ['Italian', 'Pasta', 'Vegetarian', 'Dinner'],
        ingredients: [
          { id: 1, name: 'Penne pasta', amount: '500', unit: 'g' },
          { id: 2, name: 'Heavy cream', amount: '250', unit: 'ml' },
          { id: 3, name: 'Mixed vegetables', amount: '300', unit: 'g' },
          { id: 4, name: 'Parmesan', amount: '100', unit: 'g' }
        ],
        stages: [
          { id: 1, text: 'Cook pasta according to package directions' },
          { id: 2, text: 'Sauté vegetables until tender-crisp' },
          { id: 3, text: 'Add cream and parmesan, toss with pasta' }
        ]
      }
    ],
    updated: 'Dec 2024',
    isMock: true
  },
  {
    id: 'mock-3',
    name: 'Chocolate Lava Cake',
    description: 'Decadent individual chocolate cakes with molten centers',
    servings: 4,
    tags: ['Dessert', 'Baking', 'Easy'],
    ingredients: [
      { id: 1, name: 'Dark chocolate', amount: '200', unit: 'g' },
      { id: 2, name: 'Butter', amount: '100', unit: 'g' },
      { id: 3, name: 'Eggs', amount: '4', unit: 'piece' },
      { id: 4, name: 'Sugar', amount: '100', unit: 'g' },
      { id: 5, name: 'Flour', amount: '50', unit: 'g' }
    ],
    stages: [
      { id: 1, text: 'Melt chocolate and butter together' },
      { id: 2, text: 'Whisk eggs and sugar, fold in chocolate mixture and flour' },
      { id: 3, text: 'Bake at 200°C for 12 minutes until edges are set' }
    ],
    variations: [
      {
        id: 'mock-3-v1',
        name: 'Original',
        description: 'Decadent individual chocolate cakes with molten centers',
        servings: 4,
        tags: ['Dessert', 'Baking', 'Easy'],
        ingredients: [
          { id: 1, name: 'Dark chocolate', amount: '200', unit: 'g' },
          { id: 2, name: 'Butter', amount: '100', unit: 'g' },
          { id: 3, name: 'Eggs', amount: '4', unit: 'piece' },
          { id: 4, name: 'Sugar', amount: '100', unit: 'g' },
          { id: 5, name: 'Flour', amount: '50', unit: 'g' }
        ],
        stages: [
          { id: 1, text: 'Melt chocolate and butter together' },
          { id: 2, text: 'Whisk eggs and sugar, fold in chocolate mixture and flour' },
          { id: 3, text: 'Bake at 200°C for 12 minutes until edges are set' }
        ]
      }
    ],
    updated: 'Dec 2024',
    isMock: true
  }
];

export const MOCK_DISCOVER_RECIPES = [
  {
    id: 'mock-d1',
    name: 'Classic Shakshuka',
    description: 'A delicious Middle Eastern dish of poached eggs in spiced tomato sauce',
    tags: ['Israeli', 'Breakfast', 'Vegetarian'],
    bannerImage: null,
    userCode: 'chefdemo',
    shareId: 'mock1',
    servings: 4,
    variations: [{
      id: 'mock-d1-v1',
      name: 'Original',
      description: 'A delicious Middle Eastern dish of poached eggs in spiced tomato sauce',
      servings: 4,
      tags: ['Israeli', 'Breakfast', 'Vegetarian'],
      bannerImage: null,
      ingredients: [
        { id: 1, name: 'Crushed tomatoes', amount: '400', unit: 'g' },
        { id: 2, name: 'Eggs', amount: '4', unit: 'piece' },
        { id: 3, name: 'Onion', amount: '1', unit: 'piece' },
        { id: 4, name: 'Cumin', amount: '1', unit: 'tsp' },
        { id: 5, name: 'Paprika', amount: '1', unit: 'tsp' }
      ],
      stages: [
        { id: 1, text: 'Sauté diced onion in olive oil until golden' },
        { id: 2, text: 'Add crushed tomatoes, cumin, and paprika. Simmer for 10 minutes' },
        { id: 3, text: 'Make small wells and crack eggs into them' },
        { id: 4, text: 'Cover and cook until eggs are set, about 5-7 minutes' }
      ]
    }]
  },
  {
    id: 'mock-d2',
    name: 'Creamy Pasta Primavera',
    description: 'Fresh vegetables in a light cream sauce over pasta',
    tags: ['Italian', 'Pasta', 'Vegetarian'],
    bannerImage: null,
    userCode: 'italianmama',
    shareId: 'mock2',
    servings: 6,
    variations: [{
      id: 'mock-d2-v1',
      name: 'Original',
      description: 'Fresh vegetables in a light cream sauce over pasta',
      servings: 6,
      tags: ['Italian', 'Pasta', 'Vegetarian'],
      bannerImage: null,
      ingredients: [
        { id: 1, name: 'Penne pasta', amount: '500', unit: 'g' },
        { id: 2, name: 'Heavy cream', amount: '250', unit: 'ml' },
        { id: 3, name: 'Mixed vegetables', amount: '300', unit: 'g' },
        { id: 4, name: 'Parmesan', amount: '100', unit: 'g' },
        { id: 5, name: 'Garlic', amount: '3', unit: 'piece' }
      ],
      stages: [
        { id: 1, text: 'Cook pasta according to package directions, reserve 1 cup pasta water' },
        { id: 2, text: 'Sauté garlic and vegetables until tender-crisp' },
        { id: 3, text: 'Add cream and parmesan, simmer until thickened' },
        { id: 4, text: 'Toss with pasta, adding pasta water to reach desired consistency' }
      ]
    }]
  },
  {
    id: 'mock-d3',
    name: 'Teriyaki Salmon Bowl',
    description: 'Glazed salmon over rice with fresh vegetables',
    tags: ['Asian', 'Fish', 'Healthy'],
    bannerImage: null,
    userCode: 'sushimaster',
    shareId: 'mock3',
    servings: 2,
    variations: [{
      id: 'mock-d3-v1',
      name: 'Original',
      description: 'Glazed salmon over rice with fresh vegetables',
      servings: 2,
      tags: ['Asian', 'Fish', 'Healthy'],
      bannerImage: null,
      ingredients: [
        { id: 1, name: 'Salmon fillet', amount: '300', unit: 'g' },
        { id: 2, name: 'Sushi rice', amount: '200', unit: 'g' },
        { id: 3, name: 'Soy sauce', amount: '3', unit: 'tbsp' },
        { id: 4, name: 'Honey', amount: '2', unit: 'tbsp' },
        { id: 5, name: 'Edamame', amount: '100', unit: 'g' }
      ],
      stages: [
        { id: 1, text: 'Cook sushi rice according to package directions' },
        { id: 2, text: 'Mix soy sauce and honey for teriyaki glaze' },
        { id: 3, text: 'Pan-sear salmon, brushing with glaze' },
        { id: 4, text: 'Serve over rice with edamame and pickled ginger' }
      ]
    }]
  },
  {
    id: 'mock-d4',
    name: 'Classic Hummus',
    description: 'Smooth and creamy chickpea dip with tahini',
    tags: ['Israeli', 'Vegan', 'Quick'],
    bannerImage: null,
    userCode: 'mezzeking',
    shareId: 'mock4',
    servings: 8,
    variations: [{
      id: 'mock-d4-v1',
      name: 'Original',
      description: 'Smooth and creamy chickpea dip with tahini',
      servings: 8,
      tags: ['Israeli', 'Vegan', 'Quick'],
      bannerImage: null,
      ingredients: [
        { id: 1, name: 'Chickpeas', amount: '400', unit: 'g' },
        { id: 2, name: 'Tahini', amount: '60', unit: 'g' },
        { id: 3, name: 'Lemon juice', amount: '3', unit: 'tbsp' },
        { id: 4, name: 'Garlic', amount: '2', unit: 'piece' },
        { id: 5, name: 'Olive oil', amount: '3', unit: 'tbsp' }
      ],
      stages: [
        { id: 1, text: 'Drain chickpeas, reserving liquid (aquafaba)' },
        { id: 2, text: 'Blend tahini with lemon juice and garlic until smooth' },
        { id: 3, text: 'Add chickpeas and blend, adding aquafaba for desired consistency' },
        { id: 4, text: 'Serve drizzled with olive oil and paprika' }
      ]
    }]
  },
  {
    id: 'mock-d5',
    name: 'Chocolate Lava Cake',
    description: 'Decadent chocolate cake with a molten center',
    tags: ['Dessert', 'Baking'],
    bannerImage: null,
    userCode: 'sweetooth',
    shareId: 'mock5',
    servings: 4,
    variations: [{
      id: 'mock-d5-v1',
      name: 'Original',
      description: 'Decadent chocolate cake with a molten center',
      servings: 4,
      tags: ['Dessert', 'Baking'],
      bannerImage: null,
      ingredients: [
        { id: 1, name: 'Dark chocolate', amount: '200', unit: 'g' },
        { id: 2, name: 'Butter', amount: '100', unit: 'g' },
        { id: 3, name: 'Eggs', amount: '4', unit: 'piece' },
        { id: 4, name: 'Sugar', amount: '100', unit: 'g' },
        { id: 5, name: 'Flour', amount: '50', unit: 'g' }
      ],
      stages: [
        { id: 1, text: 'Melt chocolate and butter together, let cool slightly' },
        { id: 2, text: 'Whisk eggs and sugar until pale and fluffy' },
        { id: 3, text: 'Fold in chocolate mixture and flour' },
        { id: 4, text: 'Bake at 200°C for 12 minutes - center should be jiggly' }
      ]
    }]
  }
];

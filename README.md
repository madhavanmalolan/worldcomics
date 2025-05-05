# Running
## Contracts
```
$ npx hardhat compile
$ npx hardhat run scripts/exportABI.js
$ npx hardhat run scripts/deploy.js --network baseSepolia
// edit .env with contract address from above step
```


### Create a comic
```
curl -X POST http://localhost:3000/api/generate-image \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Lucy and Alex are suddenly transported to the Spaceship interior, they are shocked as they still sitting on the coffe table.",
    "comic": {
      "name": "Space Adventures",
      "style": "Colorful comics style",
      "characters": [
        {
          "name": "Alex", 
          "portraitUrl": "http://localhost:3000/generated-images/character-s1tryk.png"
        },
        {
          "name": "Lucy", 
          "portraitUrl": "http://localhost:3000/generated-images/character-uwkhx.png"
        }
      ]
    },
    "previousPanel":"http://localhost:3000/generated-images/comic-panel-lqjmep.png",
    "scene": {
      "name": "Spaceship Interior",
      "imageUrl": "http://localhost:3000/generated-images/scene-81woi.png"
    },
    "props": [
      {
        "name": "Spaceship Remote",
        "imageUrl": "http://localhost:3000/generated-images/prop-2tm4n.png"
      }
    ]
  }'
```


  ### Create a scene
  ```
  curl -X POST http://localhost:3000/api/scenes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spaceship Interior",
    "description": "The interior of a futuristic spaceship with control panels, viewscreens, and sleek metallic surfaces. The room has blue ambient lighting and stars visible through a large window.",
    "style": "Sci-fi, detailed, realistic"
  }'
```

  ### Create a prop
  ```
  curl -X POST http://localhost:3000/api/props \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Spaceship Remote",
    "description": "A futuristic remote control device for a spaceship with holographic buttons, glowing blue elements, and an ergonomic design that fits comfortably in a human hand.",
    "style": "Sci-fi, detailed, realistic"
  }'
```

  ### Create a character
  ```
  curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Lucy",
    "description": "A girl with glasses, brown hair eye, wearing a blue sweater, have a friendly face of age around 30",
    "style": "Sci-fi, detailed, realistic"
  }'
  ```
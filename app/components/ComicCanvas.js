'use client';
import { useState, useRef, useEffect } from 'react';
import ImageGenerator from './ImageGenerator';
import CandidateGallery from './CandidateGallery';

const FONT_OPTIONS = [
  { name: 'Comic Sans MS', value: 'Comic Sans MS, cursive' },
  { name: 'Bangers', value: 'Bangers, cursive' },
  { name: 'Luckiest Guy', value: '"Luckiest Guy", cursive' },
  { name: 'Permanent Marker', value: '"Permanent Marker", cursive' },
  { name: 'Fredoka One', value: '"Fredoka One", cursive' },
  { name: 'Bubblegum Sans', value: '"Bubblegum Sans", cursive' }
];

export default function ComicCanvas({ onSave, initialImage = null }) {
  const canvasRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [image, setImage] = useState(initialImage);
  const [tool, setTool] = useState('select'); // 'select', 'bubble', 'pointer'
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });
  const [selectedFont, setSelectedFont] = useState(FONT_OPTIONS[0].value);
  const [isDraggingDiamond, setIsDraggingDiamond] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null); // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'
  const [selectedFontSize, setSelectedFontSize] = useState(16);
  const [showCandidates, setShowCandidates] = useState(false);
  const [candidates, setCandidates] = useState([]);

  // Get accurate canvas coordinates
  const getCanvasCoordinates = (clientX, clientY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Check if point is inside diamond
  const isPointInDiamond = (pointX, pointY, diamondX, diamondY, size) => {
    const dx = Math.abs(pointX - diamondX);
    const dy = Math.abs(pointY - diamondY);
    return dx + dy <= size;
  };

  // Get diamond position for a bubble
  const getDiamondPosition = (bubble) => {
    const pointerStartX = bubble.x;
    const pointerStartY = bubble.y + bubble.height / 2;
    const pointerEndX = pointerStartX + (bubble.pointerX || 0);
    const pointerEndY = pointerStartY + (bubble.pointerY || 30);
    return { x: pointerEndX, y: pointerEndY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background image if exists
    if (image) {
      const img = new window.Image(); // Use window.Image instead of Image
      img.src = image;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Redraw all elements
        elements.forEach(element => drawElement(ctx, element));
      };
    } else {
      // Draw a white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      // Redraw all elements
      elements.forEach(element => drawElement(ctx, element));
    }
  }, [image, elements]);

  useEffect(() => {
    // Load Google Fonts
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Bangers&family=Luckiest+Guy&family=Permanent+Marker&family=Fredoka+One&family=Bubblegum+Sans&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  useEffect(() => {
    // Check if there are any existing pages
    const checkExistingPages = async () => {
      try {
        const response = await fetch('/api/comics/pages');
        if (response.ok) {
          const pages = await response.json();
          if (pages.length === 0) {
            setShowCandidates(true);
            // Fetch candidates
            const candidatesResponse = await fetch('/api/comics/candidates');
            if (candidatesResponse.ok) {
              const candidatesData = await candidatesResponse.json();
              setCandidates(candidatesData);
            }
          }
        }
      } catch (error) {
        console.error('Error checking existing pages:', error);
      }
    };

    checkExistingPages();
  }, []);

  const drawElement = (ctx, element) => {
    switch (element.type) {
      case 'bubble':
        drawBubble(ctx, element);
        break;
      case 'pointer':
        drawPointer(ctx, element);
        break;
    }
  };

  const drawBubble = (ctx, bubble) => {
    // Draw the main bubble
    ctx.beginPath();
    ctx.ellipse(
      bubble.x,
      bubble.y,
      bubble.width / 2,
      bubble.height / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = 'white';
    ctx.fill();

    // Draw the triangular pointer
    const pointerStartX = bubble.x;
    const pointerStartY = bubble.y + bubble.height / 2;
    const pointerEndX = pointerStartX + (bubble.pointerX || 0);
    const pointerEndY = pointerStartY + (bubble.pointerY || 30);
    const pointerWidth = 15;

    // Draw the outer part of the pointer
    ctx.beginPath();
    ctx.moveTo(pointerStartX, pointerStartY);
    ctx.lineTo(pointerEndX, pointerEndY);
    ctx.lineTo(pointerStartX - pointerWidth, pointerStartY);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();

    // Draw yellow diamond at the tip of the pointer only if bubble is selected
    if (bubble === selectedElement) {
      const diamondSize = 8;
      ctx.beginPath();
      ctx.moveTo(pointerEndX, pointerEndY - diamondSize);
      ctx.lineTo(pointerEndX + diamondSize, pointerEndY);
      ctx.lineTo(pointerEndX, pointerEndY + diamondSize);
      ctx.lineTo(pointerEndX - diamondSize, pointerEndY);
      ctx.closePath();
      ctx.fillStyle = 'yellow';
      ctx.fill();
    }
    
    // Draw selection bounding box and resize handles if bubble is selected
    if (bubble === selectedElement) {
      const padding = 5;
      const handleSize = 8;
      const boxX = bubble.x - bubble.width / 2 - padding;
      const boxY = bubble.y - bubble.height / 2 - padding;
      const boxWidth = bubble.width + padding * 2;
      const boxHeight = bubble.height + padding * 2;

      // Draw bounding box
      ctx.strokeStyle = 'rgba(173, 216, 230, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // Draw resize handles
      const handles = [
        { x: boxX, y: boxY, type: 'nw' },
        { x: boxX + boxWidth / 2, y: boxY, type: 'n' },
        { x: boxX + boxWidth, y: boxY, type: 'ne' },
        { x: boxX + boxWidth, y: boxY + boxHeight / 2, type: 'e' },
        { x: boxX + boxWidth, y: boxY + boxHeight, type: 'se' },
        { x: boxX + boxWidth / 2, y: boxY + boxHeight, type: 's' },
        { x: boxX, y: boxY + boxHeight, type: 'sw' },
        { x: boxX, y: boxY + boxHeight / 2, type: 'w' }
      ];

      handles.forEach(handle => {
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'rgba(173, 216, 230, 0.8)';
        ctx.lineWidth = 2;
        ctx.fillRect(
          handle.x - handleSize / 2,
          handle.y - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.strokeRect(
          handle.x - handleSize / 2,
          handle.y - handleSize / 2,
          handleSize,
          handleSize
        );
      });
    }
    
    // Draw text with word wrapping
    ctx.font = `${bubble.fontSize || selectedFontSize}px ${bubble.font || selectedFont}`;
    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const words = bubble.text.split(' ');
    const lineHeight = bubble.fontSize || selectedFontSize;
    const maxWidth = bubble.width - 20;
    let line = '';
    let lines = [];
    
    // First pass: calculate all lines
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && i > 0) {
        lines.push(line);
        line = words[i] + ' ';
      } else {
        line = testLine;
      }
    }
    lines.push(line);

    // Calculate total height of text
    const totalHeight = lines.length * lineHeight;
    
    // Calculate starting Y position to center text vertically
    const startY = bubble.y - (totalHeight - lineHeight) / 2;
    
    // Draw each line
    lines.forEach((line, index) => {
      ctx.fillText(line, bubble.x, startY + (index * lineHeight));
    });
  };

  const drawPointer = (ctx, pointer) => {
    ctx.beginPath();
    ctx.moveTo(pointer.startX, pointer.startY);
    ctx.lineTo(pointer.endX, pointer.endY);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const isPointInHandle = (x, y, handleX, handleY, size) => {
    return x >= handleX - size / 2 &&
           x <= handleX + size / 2 &&
           y >= handleY - size / 2 &&
           y <= handleY + size / 2;
  };

  const isPointInBubble = (x, y, bubble) => {
    // Check if point is within the bubble's elliptical bounds
    const dx = x - bubble.x;
    const dy = y - bubble.y;
    const inBubble = (dx * dx) / (bubble.width * bubble.width / 4) + 
                    (dy * dy) / (bubble.height * bubble.height / 4) <= 1;

    // Check if point is within the pointer triangle
    const pointerStartX = bubble.x;
    const pointerStartY = bubble.y + bubble.height / 2;
    const pointerEndX = pointerStartX + (bubble.pointerX || 0);
    const pointerEndY = pointerStartY + (bubble.pointerY || 30);
    const pointerWidth = 15;
    const inPointer = isPointInTriangle(
      x, y,
      pointerStartX, pointerStartY,
      pointerEndX, pointerEndY,
      pointerStartX - pointerWidth, pointerStartY
    );

    return inBubble || inPointer;
  };

  const handleMouseDown = (e) => {
    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    if (tool === 'select') {
      // Check if clicking on a diamond first
      if (selectedElement && selectedElement.type === 'bubble') {
        const diamondPos = getDiamondPosition(selectedElement);
        if (isPointInDiamond(x, y, diamondPos.x, diamondPos.y, 8)) {
          setIsDraggingDiamond(true);
          setIsDragging(true);
          setDragStart({ x, y });
          return;
        }

        // Check if clicking on a resize handle
        const padding = 5;
        const handleSize = 8;
        const boxX = selectedElement.x - selectedElement.width / 2 - padding;
        const boxY = selectedElement.y - selectedElement.height / 2 - padding;
        const boxWidth = selectedElement.width + padding * 2;
        const boxHeight = selectedElement.height + padding * 2;

        const handles = [
          { x: boxX, y: boxY, type: 'nw' },
          { x: boxX + boxWidth / 2, y: boxY, type: 'n' },
          { x: boxX + boxWidth, y: boxY, type: 'ne' },
          { x: boxX + boxWidth, y: boxY + boxHeight / 2, type: 'e' },
          { x: boxX + boxWidth, y: boxY + boxHeight, type: 'se' },
          { x: boxX + boxWidth / 2, y: boxY + boxHeight, type: 's' },
          { x: boxX, y: boxY + boxHeight, type: 'sw' },
          { x: boxX, y: boxY + boxHeight / 2, type: 'w' }
        ];

        const clickedHandle = handles.find(handle => 
          isPointInHandle(x, y, handle.x, handle.y, handleSize)
        );

        if (clickedHandle) {
          setResizeHandle(clickedHandle.type);
          setIsDragging(true);
          setDragStart({ x, y });
          return;
        }
      }

      // Find clicked element
      const clickedElement = elements.find(element => {
        if (element.type === 'bubble') {
          return isPointInBubble(x, y, element);
        }
        return false;
      });

      if (clickedElement) {
        setSelectedElement(clickedElement);
        setElements([...elements]);
        // Only start dragging if we're clicking on the currently selected element
        if (clickedElement === selectedElement) {
          setIsDragging(true);
          setDragStart({ x, y });
        }
      } else {
        setSelectedElement(null);
        setElements([...elements]);

      }
    } else if (tool === 'bubble') {
      const newBubble = {
        type: 'bubble',
        x,
        y,
        width: 200,
        height: 100,
        text: 'Click to edit text',
        font: selectedFont,
        pointerX: 0,
        pointerY: 30
      };
      setElements([...elements, newBubble]);
      setSelectedElement(newBubble);
      setTool('select');
    } else if (tool === 'pointer') {
      const newPointer = {
        type: 'pointer',
        startX: x,
        startY: y,
        endX: x,
        endY: y
      };
      setElements([...elements, newPointer]);
      setSelectedElement(newPointer);
    }
  };

  // Helper function to check if a point is inside a triangle
  const isPointInTriangle = (px, py, x1, y1, x2, y2, x3, y3) => {
    const area = 0.5 * (-y2 * x3 + y1 * (-x2 + x3) + x1 * (y2 - y3) + x2 * y3);
    const s = 1 / (2 * area) * (y1 * x3 - x1 * y3 + (y3 - y1) * px + (x1 - x3) * py);
    const t = 1 / (2 * area) * (x1 * y2 - y1 * x2 + (y1 - y2) * px + (x2 - x1) * py);
    return s > 0 && t > 0 && 1 - s - t > 0;
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !selectedElement) return;

    const { x, y } = getCanvasCoordinates(e.clientX, e.clientY);

    if (isDraggingDiamond && selectedElement.type === 'bubble') {
      // Calculate new pointer position relative to bubble
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      selectedElement.pointerX = (selectedElement.pointerX || 30) + dx;
      selectedElement.pointerY = (selectedElement.pointerY || 30) + dy;
      
      setDragStart({ x, y });
      setElements([...elements]);
    } else if (resizeHandle && selectedElement.type === 'bubble') {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const minSize = 50; // Minimum size for bubble

      switch (resizeHandle) {
        case 'nw':
          if (selectedElement.width - dx >= minSize) {
            selectedElement.width -= dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height - dy >= minSize) {
            selectedElement.height -= dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'n':
          if (selectedElement.height - dy >= minSize) {
            selectedElement.height -= dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'ne':
          if (selectedElement.width + dx >= minSize) {
            selectedElement.width += dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height - dy >= minSize) {
            selectedElement.height -= dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'e':
          if (selectedElement.width + dx >= minSize) {
            selectedElement.width += dx;
            selectedElement.x += dx / 2;
          }
          break;
        case 'se':
          if (selectedElement.width + dx >= minSize) {
            selectedElement.width += dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height + dy >= minSize) {
            selectedElement.height += dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 's':
          if (selectedElement.height + dy >= minSize) {
            selectedElement.height += dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'sw':
          if (selectedElement.width - dx >= minSize) {
            selectedElement.width -= dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height + dy >= minSize) {
            selectedElement.height += dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'w':
          if (selectedElement.width - dx >= minSize) {
            selectedElement.width -= dx;
            selectedElement.x += dx / 2;
          }
          break;
      }

      setDragStart({ x, y });
      setElements([...elements]);
    } else if (selectedElement.type === 'bubble') {
      // Only move the bubble if we're actually dragging
      if (isDragging) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        
        selectedElement.x += dx;
        selectedElement.y += dy;
        
        setDragStart({ x, y });
        setElements([...elements]);
      }
    } else if (selectedElement.type === 'pointer') {
      selectedElement.endX = x;
      selectedElement.endY = y;
      setElements([...elements]);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsDraggingDiamond(false);
    setResizeHandle(null);
  };

  const handleImageSelected = (imageUrl) => {
    setImage(imageUrl);
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;

    // Deselect any selected element before saving
    handleDone();

    // Wait for 1 second to allow the canvas to redraw
    await new Promise(resolve => setTimeout(resolve, 1000));

    try {
      // Convert canvas to blob
      const canvas = canvasRef.current;
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      
      // Create form data
      const formData = new FormData();
      formData.append('file', blob, 'comic-canvas.png');

      // Upload to the upload route
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to save candidate');
      }

      const data = await response.json();
      console.log('Candidate saved:', data);
      const imageUrl = data.url;
      // Call the onSave callback with the saved data
      if (onSave) {
        onSave(imageUrl);
      }
    } catch (error) {
      console.error('Error saving candidate:', error);
      alert('Failed to save candidate. Please try again.');
    }
  };

  const handleDoubleClick = (e) => {
    if (selectedElement && selectedElement.type === 'bubble') {
      const newText = prompt('Enter dialogue text:', selectedElement.text);
      if (newText !== null) {
        selectedElement.text = newText;
        setElements([...elements]);
      }
    }
  };

  const handleFontChange = (e) => {
    const newFont = e.target.value;
    setSelectedFont(newFont);
    if (selectedElement && selectedElement.type === 'bubble') {
      selectedElement.font = newFont;
      setElements([...elements]);
    }
  };

  const handleDelete = () => {
    if (selectedElement) {
      setElements(elements.filter(element => element !== selectedElement));
      setSelectedElement(null);
    }
  };

  const handleFontSizeChange = (delta) => {
    if (selectedElement && selectedElement.type === 'bubble') {
      const newSize = Math.max(8, Math.min(72, (selectedElement.fontSize || selectedFontSize) + delta));
      selectedElement.fontSize = newSize;
      setSelectedFontSize(newSize);
      setElements([...elements]);
    }
  };

  const handleCandidateSelect = (candidate) => {
    setImage(candidate.imageUrl);
    setElements(candidate.elements);
    setShowCandidates(false);
  };

  const handleDone = () => {
    setSelectedElement(null);
    // Force a redraw by creating a new array reference
    setElements([...elements]);
  };

  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent scrolling while interacting with canvas
    const touch = e.touches[0];
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);

    if (tool === 'select') {
      // Check if touching a diamond first
      if (selectedElement && selectedElement.type === 'bubble') {
        const diamondPos = getDiamondPosition(selectedElement);
        if (isPointInDiamond(x, y, diamondPos.x, diamondPos.y, 8)) {
          setIsDraggingDiamond(true);
          setIsDragging(true);
          setDragStart({ x, y });
          return;
        }

        // Check if touching a resize handle
        const padding = 5;
        const handleSize = 8;
        const boxX = selectedElement.x - selectedElement.width / 2 - padding;
        const boxY = selectedElement.y - selectedElement.height / 2 - padding;
        const boxWidth = selectedElement.width + padding * 2;
        const boxHeight = selectedElement.height + padding * 2;

        const handles = [
          { x: boxX, y: boxY, type: 'nw' },
          { x: boxX + boxWidth / 2, y: boxY, type: 'n' },
          { x: boxX + boxWidth, y: boxY, type: 'ne' },
          { x: boxX + boxWidth, y: boxY + boxHeight / 2, type: 'e' },
          { x: boxX + boxWidth, y: boxY + boxHeight, type: 'se' },
          { x: boxX + boxWidth / 2, y: boxY + boxHeight, type: 's' },
          { x: boxX, y: boxY + boxHeight, type: 'sw' },
          { x: boxX, y: boxY + boxHeight / 2, type: 'w' }
        ];

        const touchedHandle = handles.find(handle => 
          isPointInHandle(x, y, handle.x, handle.y, handleSize)
        );

        if (touchedHandle) {
          setResizeHandle(touchedHandle.type);
          setIsDragging(true);
          setDragStart({ x, y });
          return;
        }
      }

      // Find touched element
      const touchedElement = elements.find(element => {
        if (element.type === 'bubble') {
          return isPointInBubble(x, y, element);
        }
        return false;
      });

      if (touchedElement) {
        setSelectedElement(touchedElement);
        setElements([...elements]);
        if (touchedElement === selectedElement) {
          setIsDragging(true);
          setDragStart({ x, y });
        }
      } else {
        setSelectedElement(null);
        setElements([...elements]);
      }
    } else if (tool === 'bubble') {
      const newBubble = {
        type: 'bubble',
        x,
        y,
        width: 200,
        height: 100,
        text: 'Click to edit text',
        font: selectedFont,
        pointerX: 0,
        pointerY: 30
      };
      setElements([...elements, newBubble]);
      setSelectedElement(newBubble);
      setTool('select');
    }
  };

  const handleTouchMove = (e) => {
    e.preventDefault(); // Prevent scrolling while dragging
    if (!isDragging || !selectedElement) return;

    const touch = e.touches[0];
    const { x, y } = getCanvasCoordinates(touch.clientX, touch.clientY);

    if (isDraggingDiamond && selectedElement.type === 'bubble') {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      selectedElement.pointerX = (selectedElement.pointerX || 30) + dx;
      selectedElement.pointerY = (selectedElement.pointerY || 30) + dy;
      
      setDragStart({ x, y });
      setElements([...elements]);
    } else if (resizeHandle && selectedElement.type === 'bubble') {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const minSize = 50;

      switch (resizeHandle) {
        case 'nw':
          if (selectedElement.width - dx >= minSize) {
            selectedElement.width -= dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height - dy >= minSize) {
            selectedElement.height -= dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'n':
          if (selectedElement.height - dy >= minSize) {
            selectedElement.height -= dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'ne':
          if (selectedElement.width + dx >= minSize) {
            selectedElement.width += dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height - dy >= minSize) {
            selectedElement.height -= dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'e':
          if (selectedElement.width + dx >= minSize) {
            selectedElement.width += dx;
            selectedElement.x += dx / 2;
          }
          break;
        case 'se':
          if (selectedElement.width + dx >= minSize) {
            selectedElement.width += dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height + dy >= minSize) {
            selectedElement.height += dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 's':
          if (selectedElement.height + dy >= minSize) {
            selectedElement.height += dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'sw':
          if (selectedElement.width - dx >= minSize) {
            selectedElement.width -= dx;
            selectedElement.x += dx / 2;
          }
          if (selectedElement.height + dy >= minSize) {
            selectedElement.height += dy;
            selectedElement.y += dy / 2;
          }
          break;
        case 'w':
          if (selectedElement.width - dx >= minSize) {
            selectedElement.width -= dx;
            selectedElement.x += dx / 2;
          }
          break;
      }

      setDragStart({ x, y });
      setElements([...elements]);
    } else if (selectedElement.type === 'bubble') {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      
      selectedElement.x += dx;
      selectedElement.y += dy;
      
      setDragStart({ x, y });
      setElements([...elements]);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsDragging(false);
    setIsDraggingDiamond(false);
    setResizeHandle(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-4 py-2 rounded ${
            tool === 'select' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setTool('select')}
        >
          Select
        </button>
        <button
          className={`px-4 py-2 rounded ${
            tool === 'bubble' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
          onClick={() => setTool('bubble')}
        >
          Add Dialogue
        </button>
        <select
          value={selectedFont}
          onChange={handleFontChange}
          className="px-4 py-2 rounded bg-gray-200"
        >
          {FONT_OPTIONS.map(font => (
            <option key={font.value} value={font.value}>
              {font.name}
            </option>
          ))}
        </select>
        <button
          className="px-4 py-2 rounded bg-red-500 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleDelete}
          disabled={!selectedElement}
        >
          Delete
        </button>
        <button
          className="px-4 py-2 rounded bg-green-500 text-white"
          onClick={handleSave}
        >
          Save
        </button>
        <div className="flex items-center gap-2">
          <button
            className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleFontSizeChange(-2)}
            disabled={!selectedElement || selectedElement.type !== 'bubble'}
          >
            A-
          </button>
          <span className="text-sm">
            {selectedElement?.type === 'bubble' ? (selectedElement.fontSize || selectedFontSize) : selectedFontSize}px
          </span>
          <button
            className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleFontSizeChange(2)}
            disabled={!selectedElement || selectedElement.type !== 'bubble'}
          >
            A+
          </button>
        </div>
      </div>
      {showCandidates ? (
        <CandidateGallery onSelect={handleCandidateSelect} />
      ) : image ? (
        <div className="relative w-full" style={{ paddingBottom: '100%' }}>
          <canvas
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            className="border border-gray-300 absolute inset-0 w-full h-full object-contain touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </div>
      ) : (
        <div className="border border-gray-300 p-4 rounded-lg">
          <ImageGenerator
            onImageSelected={handleImageSelected}
            currentImage={image}
          />
        </div>
      )}
    </div>
  );
} 
import { UnrealBloomPass } from '//unpkg.com/three/examples/jsm/postprocessing/UnrealBloomPass.js';

const data = await d3.json("graph.json");

const gData = {
  nodes: data.nodes,
  links: data.links
};

// cross-link node objects
gData.links.forEach(link => {
  const a = data.nodes.find(node => node.id === link.source);
  const b = data.nodes.find(node => node.id === link.target);
  if (a && b) {
    !a.neighbors && (a.neighbors = []);
    !b.neighbors && (b.neighbors = []);
    a.neighbors.push(b);
    b.neighbors.push(a);

    !a.links && (a.links = []);
    !b.links && (b.links = []);
    a.links.push(link);
    b.links.push(link);
  }
});

const highlightNodes = new Set();
const highlightLinks = new Set();
let hoverNode = null;

const Graph = ForceGraph3D({controls: "fly"})
(document.getElementById('3d-graph'))
  .graphData(gData)
  .backgroundColor('#000003')
  .linkDirectionalArrowLength(3)
  .linkDirectionalArrowRelPos(1)
  .linkCurvature(0.1)
  .nodeAutoColorBy('group')
  .nodeLabel('name')
  .nodeVisibility(node => (node.visible === undefined) ? true : node.visible)
  .linkVisibility(link => (link.visible === undefined) ? true : link.visible)
  .onNodeDragEnd(node => {
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
  })
  // .onNodeHover(centerCamera)
  .linkDirectionalParticles(link => highlightLinks.has(link) ? 10 : 0)
  .linkDirectionalParticleWidth(3)
  .linkDirectionalParticleSpeed(0.005)
  .linkDirectionalParticleColor(link => hoverNode && link.source === hoverNode ? 'red' : 'green')
  .onNodeClick(clickNode)
  .onLinkClick(highlightLink)
  .nodeThreeObject(renderNode)
;

Graph.d3Force('charge').strength(-100);

const bloomPass = new UnrealBloomPass();
bloomPass.strength = 2;
bloomPass.radius = 1;
bloomPass.threshold = 0;
Graph.postProcessingComposer().addPass(bloomPass);

// const gui = new dat.GUI();

// const Settings = function() {
//       this.distance = 20;
//     };
//
// const settings = new Settings();
//
// const linkForce = Graph
//       .d3Force('link')
//       .distance(link => settings.distance);
//
// const controllerOne = gui.add(settings, 'distance', 0, 100);
// controllerOne.onChange(updateLinkDistance);
//
// document.getElementById('gui').appendChild(gui.domElement);
//
// function updateLinkDistance() {
//   linkForce.distance(link => settings.distance);
//   Graph.numDimensions(3); // Re-heat simulation
// }

function renderNode(node) {
    const group = new THREE.Group(); // Create a group to hold the sphere and the text
    const size = node.val;
    const color = node.color;

    // Create the sphere
    const sphereGeometry = new THREE.SphereGeometry(size, 32, 32); // Adjust the size as needed

    const normalMaterial = new THREE.MeshBasicMaterial({ color: color, transparent: true});
    const bloomMaterial = new THREE.MeshStandardMaterial({
		  toneMapped: false,
		  emissive: color,
		  emissiveIntensity: 5
	  });
	  const isHighlighted = hoverNode && node === hoverNode;
	  const material = isHighlighted ? bloomMaterial : normalMaterial;
    const sphere = new THREE.Mesh(sphereGeometry, material);
    group.add(sphere); // Add the sphere to the group

    // Create the text
    const text = wrapText(node.name, 20); // Your wrapText function
    const sprite = new SpriteText(text);
    sprite.material.depthWrite = false; // Make sprite background transparent
    sprite.color = color;
    sprite.textHeight = 3;
    sprite.position.set(0, -(size+10), 0); // Position the text below the sphere, adjust y as needed
    group.add(sprite); // Add the sprite text to the group

    return group; // Return the group containing both the sphere and text
}

function clickNode(node, event) {
  // if shift key is hold then center/zoom on node
  if (event.shiftKey) {
    centerCamera(node);
  } else if (event.ctrlKey) {
    highlightNode(node === hoverNode ? null : node, true);
  } else {
    highlightNode(node === hoverNode ? null : node, false);
  }
}

export function highlightAndCenter(id) {
  const node = gData.nodes.find(node => node.id === id);
  highlightNode(node, false);
  centerCamera(node);
}

function highlightNode(node, focus = false) {
  // no state change
  if ((!node && !highlightNodes.size) || (node && hoverNode === node)) return;

  showDescription(node);

  highlightNodes.clear();
  highlightLinks.clear();
  if (node) {
    highlightNodes.add(node);
    node.neighbors.forEach(neighbor => highlightNodes.add(neighbor));
    node.links.forEach(link => highlightLinks.add(link));
  }

  hoverNode = node || null;

  if (focus) {
    hideNonHighlighted();
  } else {
    //defocusNonHighlighted();
  }
  updateHighlight();
}

function highlightLink(link) {
  highlightNodes.clear();
  highlightLinks.clear();
  if (link) {
    highlightLinks.add(link);
    highlightNodes.add(link.source);
    highlightNodes.add(link.target);
  }

  updateHighlight();
}

function hideNonHighlighted() {
  //manage the visibility of the rest
	gData.nodes.filter(node => ![...highlightNodes].includes(node)).forEach(other_node => {
		other_node.visible = (hoverNode ? false : true);
	});		
	gData.links.filter(link => ![...highlightLinks].includes(link)).forEach(other_link => {
		other_link.visible = (hoverNode ? false : true);
	});
}

function defocusNonHighlighted() {
  //manage the visibility of the rest
	gData.nodes.filter(node => ![...highlightNodes].includes(node)).forEach(other_node => {
		other_node.color = (hoverNode ? "gray" : other_node.color);
	});		
	gData.links.filter(link => ![...highlightLinks].includes(link)).forEach(other_link => {
		other_link.color = (hoverNode ? "gray" : other_link.color);
	});
	Graph.nodeColor(node => node.color);
}

function updateHighlight() {
  // trigger update of highlighted objects in scene
  Graph
    .nodeColor(Graph.nodeColor())
    .nodeOpacity(Graph.nodeOpacity())
    .linkWidth(Graph.linkWidth())
    .linkDirectionalParticles(Graph.linkDirectionalParticles());

}

function centerCamera(node) {
  // Aim at node from outside it
  const distance = 100;
  const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);

  const newPos = node.x || node.y || node.z
    ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
    : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

  Graph.cameraPosition(
    newPos, // new position
    node, // lookAt ({ x, y, z })
    3000  // ms transition duration
  );
}

function measureTextWidth(text, fontSize = 10) {
  const averageCharWidth = fontSize * 0.6; // Approximation: each character averages 60% of the font size in width
  return text.length * averageCharWidth;
}

function wrapText(text, maxLineWidth) {
  let lines = [];
  let words = text.split(' ');
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    let word = words[i];
    let lineWidth = measureTextWidth(currentLine + " " + word);
    if (lineWidth < maxLineWidth) {
      currentLine += " " + word;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  lines.push(currentLine);

  return lines.join('\n');
}

// shows description for highlighted node
function showDescription(node) {
  const titleDiv = document.getElementById("title");
  titleDiv.innerHTML = node ? node.name : "";

  // find nodes that are sources of links to this node
  const sources = gData.links.filter(link => link.target === node);
  var causes = "";
  if (sources.length) {
    causes += "🟢 Причини:<br><ul>";
    sources.forEach(source => {
      causes += "<li><a class='link' style='cursor: pointer' onClick='highlightAndCenter(\""+source.source.id+"\")'>" + source.source.name + "</a></li>";
    });
    causes += "</ul>";
  }
  const causesDiv = document.getElementById("causes");
  causesDiv.innerHTML = causes;

  // find nodes that are targets of links from this node
  const targets = gData.links.filter(link => link.source === node);
  var effects = "";
  if (targets.length) {
    effects += "🔴 Наслідки:<br><ul>";
    targets.forEach(target => {
      effects += "<li><a class='link' style='cursor: pointer' onClick='highlightAndCenter(\""+target.target.id+"\")'>"+target.target.name + "</a></li>";
    });
    effects += "</ul>";
  }
  const effectsDiv = document.getElementById("effects");
  effectsDiv.innerHTML = effects;
}


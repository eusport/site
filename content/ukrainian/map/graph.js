import * as THREE from "three";
import SpriteText from "three-spritetext";
import { UnrealBloomPass } from "//unpkg.com/three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { micromark } from "https://esm.sh/micromark@3";

import Palette from "./palette.js"; // Adjust the path as per your folder structure

const data = await d3.json("graph.json");

const gData = {
  nodes: data.nodes,
  links: data.links,
};

const palette = new Palette(searchNodes());
palette.start();

export function showPalette() {
  palette.showPalette();
}

// cross-link node objects
gData.links.forEach((link) => {
  const a = data.nodes.find((node) => node.id === link.source);
  const b = data.nodes.find((node) => node.id === link.target);
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

function activeGroups() {
  if (selectedNode) {
    return new Set([selectedNode, ...selectedNode.neighbors]).map(
      (node) => node.group,
    );
  }

  return new Set(gData.nodes.map((node) => node.group));
}

// set different colors
const groupsColors = {
  Інфраструктура: "#00bbff",
  Автономія: "#ff8000",
  KPI: "#ff0000",
  Економіка: "#f0f000",
  Тренерство: "#cc55cc",
  Управління: "#00ff80",
  Клуби: "#00ffff",
  Ідеологія: "#0080ff",
  "": "#bbb",
};

function groupName(group) {
  if (group == "") return "Невідомо";
  return group;
}

function showGroups() {
  const groups = activeGroups();

  // render the ul list with color circle and group name into div with id 'groups'
  const groupsDiv = document.getElementById("groups");
  groupsDiv.innerHTML =
    '<ul style="list-style-type: none;">' +
    [...groups]
      .map((group) => {
        group = group.trim();
        console.log("-" + group + "-");
        const color = groupsColors[group];
        const groupJs = escapeHtml(group);
        return `<li style="padding-top: 5px">
      <span onclick="selectGroup('${groupJs}')" style="cursor: pointer">
      <span class="circle" style="background-color: ${color}"></span>${groupName(
        group,
      )}
      </span>
      </li>`;
      })
      .join("") +
    "</ul>";
}

const highlightNodes = new Set();
const highlightLinks = new Set();
let selectedNode = null;
let isolateMode = false;

let sizeMode = "influence";
let zoomFactor = 15; // node zoom factor

showGroups();

function isNodeVisible(node) {
  if (!selectedNode || !isolateMode) {
    return true;
  }

  return highlightNodes.has(node);
}

function isLinkVisible(link) {
  if (!selectedNode || !isolateMode) {
    return true;
  }

  return highlightLinks.has(link);
}

function nodeColor(node) {
  var color = groupsColors[node.group];
  if (selectedNode) {
    if (node === selectedNode) {
      color = "yellow";
      // if node is target neighbor of selected node, set it to red
    } else if (selectedNode.links.find((link) => link.target === node)) {
      color = "red";
      // if node is a source neighbor of selected node, set it to green
    } else if (selectedNode.links.find((link) => link.source === node)) {
      color = "green";
    } else {
      color = "#888";
    }
  } else if (highlightNodes.size) {
    if (!highlightNodes.has(node)) {
      color = "#888";
    }
  }

  return color;
}

const Graph = ForceGraph3D({ controls: "orbit" })(
  document.getElementById("3d-graph"),
)
  .graphData(gData)
  .backgroundColor("#000003")
  .linkDirectionalArrowLength(3)
  .linkDirectionalArrowRelPos(1)
  .linkCurvature(0.1)
  // .nodeAutoColorBy('group')
  // .nodeColor(node => nodeColor(node))
  .nodeLabel("name")
  .nodeVisibility(isNodeVisible)
  .linkVisibility(isLinkVisible)
  .onNodeDragEnd((node) => {
    node.fx = node.x;
    node.fy = node.y;
    node.fz = node.z;
  })
  // .onNodeHover(centerCamera)
  .linkDirectionalParticles((link) => (highlightLinks.has(link) ? 50 : 0))
  .linkDirectionalParticleWidth(1)
  .linkDirectionalParticleSpeed(0.002)
  .linkDirectionalParticleColor((link) =>
    selectedNode && link.source === selectedNode
      ? "red"
      : selectedNode && highlightNodes.size
        ? "green"
        : "white",
  )
  .onNodeClick(clickNode)
  .nodeThreeObject(renderNode);
Graph.d3Force("charge").strength(-100);

const bloomPass = new UnrealBloomPass();
bloomPass.strength = 1;
bloomPass.radius = 1;
bloomPass.threshold = 0;
Graph.postProcessingComposer().addPass(bloomPass);

function renderNode(node) {
  const group = new THREE.Group(); // Create a group to hold the sphere and the text
  var size = (sizeMode == "influence" ? node.val : node.exposure) * zoomFactor;
  const color = nodeColor(node);

  // if (selectedNode) {
  //   if (node === selectedNode) {
  //     color = 'yellow';
  //     // if node is target neighbor of selected node, set it to red
  //   } else if (selectedNode.links.find(link => link.target === node)) {
  //     color = 'red';
  //     // if node is a source neighbor of selected node, set it to green
  //   } else if (selectedNode.links.find(link => link.source === node)) {
  //     color = 'green';
  //   } else {
  //     color = '#888';
  //   }
  // } else if (highlightNodes.size) {
  //   if (!highlightNodes.has(node)) {
  //     color = '#888';
  //     size = 1;
  //   } else {
  //     size = 10;
  //   }
  // }

  // Create the sphere
  const sphereGeometry = new THREE.SphereGeometry(size, 32, 32); // Adjust the size as needed

  const normalMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
  });
  const sphere = new THREE.Mesh(sphereGeometry, normalMaterial);
  group.add(sphere); // Add the sphere to the group

  // Create the text
  const text = wrapText(node.name, 20); // Your wrapText function
  const sprite = new SpriteText(text);
  sprite.material.depthWrite = false; // Make sprite background transparent
  sprite.color = color;
  sprite.textHeight = 3;
  sprite.position.set(0, -(size + 10), 0); // Position the text below the sphere, adjust y as needed
  group.add(sprite); // Add the sprite text to the group

  return group; // Return the group containing both the sphere and text
}

function clickNode(node, event) {
  // if shift key is hold then center/zoom on node
  if (event.shiftKey) {
    centerCamera(node);
  } else if (event.ctrlKey) {
    highlightNode(node === selectedNode ? null : node, true);
  } else {
    highlightNode(node === selectedNode ? null : node, false);
  }
}

const groups = new Set(gData.nodes.map((node) => node.group));
const allGroups = Array.from(groups);

export function searchNodes() {
  var nodes = gData.nodes.map((node) => {
    return {
      id: node.id,
      name: node.name,
      mdIcon: "dark_mode",
      keywords: "lol",
      handler: () => highlightAndCenter(node.id),
    };
  });
  return Array.from(nodes);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeForJs(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function highlightGroup(focus = false) {
  selectedNode = null;
  // if there any highlighted nodes, get the name of the group of the first one
  const group = highlightNodes.size
    ? highlightNodes.values().next().value.group
    : null;
  var nextGroup;
  if (group == null) {
    nextGroup = allGroups[0];
  } else {
    // find next group in the list
    const index = allGroups.indexOf(group);
    const nextIndex = (index + 1) % allGroups.length;

    // if it's the last group, clear highlight
    if (nextIndex === 0) {
      clearHighlight();
      return;
    }

    nextGroup = allGroups[nextIndex];
  }

  selectGroup(nextGroup);
}

export function selectGroup(group) {
  highlightNode(null);
  const nodes = gData.nodes.filter((node) => node.group === group);
  highlightOnlyNodes(nodes, focus);
  showDescriptionGroup(group);
  showGroups();
}

export function multiplyZoomFactor(factor) {
  zoomFactor *= factor;
  Graph.nodeThreeObject(renderNode);
}

export function setMode(mode) {
  switch (mode) {
    case "influence":
      sizeMode = "influence";
      Graph.nodeThreeObject(renderNode);
      break;
    case "exposure":
      sizeMode = "exposure";
      Graph.nodeThreeObject(renderNode);
      break;
  }
}

export function highlightAndCenter(id) {
  const node = gData.nodes.find((node) => node.id === id);
  highlightNode(node, false);
  centerCamera(node);
}

export function clearHighlight() {
  highlightNode(null);
}

function highlightNode(node, focus = false) {
  // no state change
  if ((!node && !highlightNodes.size) || (node && selectedNode === node))
    return;

  showDescriptionSelectedNode(node);

  highlightNodes.clear();
  highlightLinks.clear();

  selectedNode = node || null;

  if (node) {
    highlightNodes.add(node);
    node.neighbors.forEach((neighbor) => highlightNodes.add(neighbor));
    node.links.forEach((link) => highlightLinks.add(link));
  }
  isolateMode = focus;

  updateHighlight();

  Graph.nodeThreeObject(renderNode);
}

function highlightOnlyNodes(nodes, focus = false) {
  showDescriptionSelectedNode(null);

  highlightNodes.clear();
  highlightLinks.clear();

  nodes.forEach((node) => {
    highlightNodes.add(node);
    node.links?.forEach((link) => highlightLinks.add(link));
  });
  isolateMode = focus;

  updateHighlight();

  Graph.nodeThreeObject(renderNode);
}

function updateHighlight() {
  // trigger update of highlighted objects in scene
  Graph.nodeColor(Graph.nodeColor())
    .nodeOpacity(Graph.nodeOpacity())
    .linkWidth(Graph.linkWidth())
    .linkDirectionalParticles(Graph.linkDirectionalParticles());
}

function centerCamera(node) {
  // Aim at node from outside it
  const distance = 100;
  const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);

  const newPos =
    node.x || node.y || node.z
      ? { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
      : { x: 0, y: 0, z: distance }; // special case if node is in (0,0,0)

  Graph.cameraPosition(
    newPos, // new position
    node, // lookAt ({ x, y, z })
    3000, // ms transition duration
  );
}

function measureTextWidth(text, fontSize = 10) {
  const averageCharWidth = fontSize * 0.6; // Approximation: each character averages 60% of the font size in width
  return text.length * averageCharWidth;
}

function wrapText(text, maxLineWidth) {
  let lines = [];
  let words = text.split(" ");
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

  return lines.join("\n");
}

// shows description for highlighted node
function showDescriptionSelectedNode(node) {
  const descDiv = document.getElementById("description");
  const titleDiv = document.getElementById("title");
  const causesDiv = document.getElementById("causes");
  const effectsDiv = document.getElementById("effects");
  const descriptionDiv = document.getElementById("node-description");

  if (node == null) {
    descDiv.style.display = "none";
    titleDiv.innerHTML = "";
    causesDiv.innerHTML = "";
    effectsDiv.innerHTML = "";
    descriptionDiv.innerHTML = "";
    return;
  }

  descDiv.style.display = "block";

  const formLink = `
    <div>
    <div style="color: #ccc; text-decoration: none; font-size: 15px; padding-top: 5px; padding-bottom: 5px;">
    ✅ Допоможіть описати проблему краще! Якщо ви маєте краще формулювання або розумієте причини та наслідки або не згодні з описом, будь-ласка, напишіть нам через цю форму:
    </div>
    <a target="_blank" href="https://forms.gle/UsiRAhVMsy6JktkK6" style="color: #bbbbff; none; font-size: 18px;">
    Google Form
    </a>
    </div>
    `;
  const nodeTitle = node ? escapeHtml(node.name) : "";
  const text =
    '<div style="width: 100%; display: flex;  justify-content: space-between;"><span>' +
    nodeTitle +
    '</span><span style="white-space: nowrap;"><a id="toggleButton" style="font-size: 18px; cursor: pointer; margin-left: 10px;">▼</a> <a class="close" style="margin-left: 5px; cursor: pointer;" onClick="clearHighlight()">✖</a><span></div>' +
    formLink;
  titleDiv.style.display = "block";
  titleDiv.innerHTML = node ? text : "";

  // find nodes that are sources of links to this node
  const sources = gData.links.filter((link) => link.target === node);
  var causes = "";
  if (sources.length) {
    causes += "🟢 Причини:<br><ul>";
    sources.forEach((source) => {
      let nodeId = escapeForJs(source.source.id);
      let nodeName = escapeHtml(source.source.name);
      causes += `<li><a class='link' style='cursor: pointer' onClick='highlightAndCenter("${nodeId}")'>${nodeName}</a></li>`;
      // causes += "<li><a class='link' style='cursor: pointer' onClick='highlightAndCenter(\"" + source.source.id + "\")'>" + source.source.name + "</a></li>";
    });
    causes += "</ul>";
  }
  causesDiv.innerHTML = causes;

  // find nodes that are targets of links from this node
  const targets = gData.links.filter((link) => link.source === node);
  var effects = "";
  if (targets.length) {
    effects += "🔴 Наслідки:<br><ul>";
    targets.forEach((target) => {
      let nodeId = escapeForJs(target.target.id);
      let nodeName = escapeHtml(target.target.name);
      effects += `<li><a class='link' style='cursor: pointer' onClick='highlightAndCenter("${nodeId}")'>${nodeName}</a></li>`;
    });
    effects += "</ul>";
  }
  effectsDiv.innerHTML = effects;

  if (node.description && node.description != "") {
    const md = micromark(node.description);
    var desc = "🔵 Опис:<br>" + md;
    descriptionDiv.innerHTML = desc;
  } else {
    descriptionDiv.innerHTML = "";
  }
}

function showDescriptionGroup(group) {
  const descDiv = document.getElementById("description");
  descDiv.style.display = "block";
  const titleDiv = document.getElementById("title");
  const text =
    groupName(group) +
    '<span style="white-space: nowrap;"><a id="toggleButton" style="font-size: 18px; cursor: pointer; margin-left: 10px;">▼</a> <a class="close" style="margin-left: 5px; cursor: pointer;" onClick="clearHighlight()">✖</a><span>';
  titleDiv.innerHTML = text;

  // find nodes that are sources of links to this node
  const nodes = gData.nodes.filter((node) => node.group === group);
  var causes = "";
  if (nodes.length) {
    causes += "🟢 Проблеми:<br><ul>";
    nodes.forEach((node) => {
      let nodeId = escapeForJs(node.id);
      let nodeName = escapeHtml(node.name);
      causes += `<li><a class='link' style='cursor: pointer' onClick='highlightAndCenter("${nodeId}")'>${nodeName}</a></li>`;

      // causes += "<li><a class='link' style='cursor: pointer' onClick='highlightAndCenter(\"" + escapeForJs(node.id) + "\")'>" + escapeHtml(node.name) + "</a></li>";
    });
    causes += "</ul>";
  }
  const causesDiv = document.getElementById("causes");
  causesDiv.innerHTML = causes;
}

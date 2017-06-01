var nodes = [
  {id:2,v:3},
  {id:3,v:3},
  {id:4,v:3},
  {id:5,v:2},
  {id:6,v:3},
  {id:7,v:6}
];

var edges = [
  {s:2,t:6},
  {s:2,t:7},
  {s:3,t:5},
  {s:3,t:6},
  {s:6,t:2},
  {s:6,t:7}
];

var layout = new G2.Layout.Linear({
  nodes: nodes
});
nodes = layout.getNodes();

var chart = new G2.Chart({
  id: 'c1',
  forceFit: true,
  height: 400,
  animate: true,
});

var edgeview = chart.createView();
edgeview.coord("polar").reflect('y');
edgeview.source(edges);
edgeview.axis(false);
edgeview.tooltip({
  crosshairs: true
});
edgeview.edge().position(G2.Stat.link('s*t',nodes)).shape("arc").tooltip("s*t");

var nodeview = chart.createView();
nodeview.coord("polar").reflect('y');
nodeview.source(nodes);
nodeview.axis(false);
nodeview.tooltip({
  crosshairs: true
});
nodeview.point().position("x*y").size("v").shape("circle").tooltip("v").label('v');

chart.legend(false);
chart.render();

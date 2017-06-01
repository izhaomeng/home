objmerge = arbor.etc.objmerge;
objcopy = arbor.etc.objcopy;

particleSystem = arbor.ParticleSystem(2600, 512, 0.5);
particleSystem.screenSize($("#viewport").width, $("#viewport").height);
particleSystem.screenPadding(40);
particleSystem.renderer = renderer("#viewport");


setInterval(updateGraph, 900);

function updateGraph(e){
    var data = $("#gv").val()
    var network = parse(data)
    $.each(network.nodes, function(nname, ndata) {
        if (ndata.label === undefined) ndata.label = nname
    })
    particleSystem.merge(network)
    //particleSystem.renderer.redraw()
}

function renderer(canvas) {
    var canvas = $(canvas).get(0)
    var ctx = canvas.getContext("2d");
    var gfx = arbor.Graphics(canvas)

    // helpers for figuring out where to draw arrows (thanks springy.js)
    var intersect_line_line = function(p1, p2, p3, p4) {
        var denom = ((p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y));
        if (denom === 0) return false // lines are parallel
        var ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
        var ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

        if (ua < 0 || ua > 1 || ub < 0 || ub > 1) return false
        return arbor.Point(p1.x + ua * (p2.x - p1.x), p1.y + ua * (p2.y - p1.y));
    }

    var intersect_line_box = function(p1, p2, boxTuple) {
        var p3 = {
                x: boxTuple[0],
                y: boxTuple[1]
            },
            w = boxTuple[2],
            h = boxTuple[3]

        var tl = {
            x: p3.x,
            y: p3.y
        };
        var tr = {
            x: p3.x + w,
            y: p3.y
        };
        var bl = {
            x: p3.x,
            y: p3.y + h
        };
        var br = {
            x: p3.x + w,
            y: p3.y + h
        };

        return intersect_line_line(p1, p2, tl, tr) ||
            intersect_line_line(p1, p2, tr, br) ||
            intersect_line_line(p1, p2, br, bl) ||
            intersect_line_line(p1, p2, bl, tl) ||
            false
    }

    var that = {
        //
        // the particle system will call the init function once, right before the
        // first frame is to be drawn. it's a good place to set up the canvas and
        // to pass the canvas size to the particle system
        //
        init: function(system) {
            // save a reference to the particle system for use in the .redraw() loop
            particleSystem = system

            // inform the system of the screen dimensions so it can map coords for us.
            // if the canvas is ever resized, screenSize should be called again with
            // the new dimensions
            particleSystem.screenSize(canvas.width, canvas.height)
            particleSystem.screenPadding(40) // leave an extra 20px of whitespace per side

            that.initMouseHandling()
        },

        //
        // redraw will be called repeatedly during the run whenever the node positions
        // change. the new positions for the nodes can be accessed by looking at the
        // .p attribute of a given node. however the p.x & p.y values are in the coordinates
        // of the particle system rather than the screen. you can either map them to
        // the screen yourself, or use the convenience iterators .eachNode (and .eachEdge)
        // which allow you to step through the actual node objects but also pass an
        // x,y point in the screen's coordinate system
        //

        redraw: function() {
            if (!particleSystem) return

            ctx.clearRect(0, 0, canvas.width, canvas.height)

            var nodeBoxes = {}
            particleSystem.eachNode(function(node, pt) {
                // node: {mass:#, p:{x,y}, name:"", data:{}}
                // pt:   {x:#, y:#}  node position in screen coords


                // determine the box size and round off the coords if we'll be
                // drawing a text label (awful alignment jitter otherwise...)
                var label = node.data.label || ""
                var w = ctx.measureText("" + label).width + 10
                if (!("" + label).match(/^[ \t]*$/)) {
                    pt.x = Math.floor(pt.x)
                    pt.y = Math.floor(pt.y)
                } else {
                    label = null
                }

                // draw a rectangle centered at pt
                if (node.data.color) ctx.fillStyle = node.data.color
                    // else ctx.fillStyle = "#d0d0d0"
                else ctx.fillStyle = "rgba(0,0,0,.2)"
                if (node.data.color == 'none') ctx.fillStyle = "white"


                // ctx.fillRect(pt.x-w/2, pt.y-10, w,20)
                if (node.data.shape == 'dot') {
                    gfx.oval(pt.x - w / 2, pt.y - w / 2, w, w, {
                        fill: ctx.fillStyle
                    })
                    nodeBoxes[node.name] = [pt.x - w / 2, pt.y - w / 2, w, w]
                } else {
                    gfx.rect(pt.x - w / 2, pt.y - 10, w, 20, 4, {
                        fill: ctx.fillStyle
                    })
                    nodeBoxes[node.name] = [pt.x - w / 2, pt.y - 11, w, 22]
                }

                // w = Math.max(20,w)

                // draw the text
                if (label) {
                    ctx.font = "12px Helvetica"
                    ctx.textAlign = "center"
                    ctx.fillStyle = "white"
                    if (node.data.color == 'none') ctx.fillStyle = '#333333'
                    ctx.fillText(label || "", pt.x, pt.y + 4)
                    ctx.fillText(label || "", pt.x, pt.y + 4)
                }
            })


            ctx.strokeStyle = "#cccccc"
            ctx.lineWidth = 1
            ctx.beginPath()
            particleSystem.eachEdge(function(edge, pt1, pt2) {
                // edge: {source:Node, target:Node, length:#, data:{}}
                // pt1:  {x:#, y:#}  source position in screen coords
                // pt2:  {x:#, y:#}  target position in screen coords

                var weight = edge.data.weight
                var color = edge.data.color

                // trace(color)
                if (!color || ("" + color).match(/^[ \t]*$/)) color = null

                // find the start point
                var tail = intersect_line_box(pt1, pt2, nodeBoxes[edge.source.name])
                var head = intersect_line_box(tail, pt2, nodeBoxes[edge.target.name])

                ctx.save()
                ctx.beginPath()

                if (!isNaN(weight)) ctx.lineWidth = weight
                if (color) ctx.strokeStyle = color
                    // if (color) trace(color)
                ctx.fillStyle = null

                ctx.moveTo(tail.x, tail.y)
                ctx.lineTo(head.x, head.y)
                ctx.stroke()
                ctx.restore()

                // draw an arrowhead if this is a -> style edge
                if (edge.data.directed) {
                    ctx.save()
                        // move to the head position of the edge we just drew
                    var wt = !isNaN(weight) ? parseFloat(weight) : ctx.lineWidth
                    var arrowLength = 6 + wt
                    var arrowWidth = 2 + wt
                    ctx.fillStyle = (color) ? color : ctx.strokeStyle
                    ctx.translate(head.x, head.y);
                    ctx.rotate(Math.atan2(head.y - tail.y, head.x - tail.x));

                    // delete some of the edge that's already there (so the point isn't hidden)
                    ctx.clearRect(-arrowLength / 2, -wt / 2, arrowLength / 2, wt)

                    // draw the chevron
                    ctx.beginPath();
                    ctx.moveTo(-arrowLength, arrowWidth);
                    ctx.lineTo(0, 0);
                    ctx.lineTo(-arrowLength, -arrowWidth);
                    ctx.lineTo(-arrowLength * 0.8, -0);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore()
                }
            })



        },
        initMouseHandling: function() {
            // no-nonsense drag and drop (thanks springy.js)
            selected = null;
            nearest = null;
            var dragged = null;
            var oldmass = 1


            var handler = {
                clicked: function(e) {
                    var pos = $(canvas).offset();
                    _mouseP = arbor.Point(e.pageX - pos.left, e.pageY - pos.top)
                    selected = nearest = dragged = particleSystem.nearest(_mouseP);

                    if (dragged.node !== null) dragged.node.fixed = true

                    $(canvas).bind('mousemove', handler.dragged)
                    $(window).bind('mouseup', handler.dropped)

                    return false
                },
                dragged: function(e) {
                    var old_nearest = nearest && nearest.node._id
                    var pos = $(canvas).offset();
                    var s = arbor.Point(e.pageX - pos.left, e.pageY - pos.top)

                    if (!nearest) return
                    if (dragged !== null && dragged.node !== null) {
                        var p = particleSystem.fromScreen(s)
                        dragged.node.p = p //{x:p.x, y:p.y}
                            //        			dragged.tempMass = 100000
                    }

                    return false
                },

                dropped: function(e) {
                    if (dragged === null || dragged.node === undefined) return
                    if (dragged.node !== null) dragged.node.fixed = false
                    dragged.node.tempMass = 1000
                    dragged = null;
                    selected = null
                    $(canvas).unbind('mousemove', handler.dragged)
                    $(window).unbind('mouseup', handler.dropped)
                    _mouseP = null
                    return false
                }

            }

            $(canvas).mousedown(handler.clicked);
        },
    }
    return that
}


function parse(s) {
    var lines = s.split('\n')
    var statements = []
    $.each(lines, function(i, line) {
        var tokens = lechs(line)
        if (tokens.length > 0) statements.push(tokens)
    })

    return yack(statements)
}

function yack(statements) {
    var nodes = {}
    var edges = {}

    var nodestyle = {}
    var edgestyle = {}
    $.each(statements, function(i, st) {
        var types = $.map(st, function(token) {
            return token.type
        }).join('-')

        // trace(st)
        if (types.match(/ident-arrow-ident(-style)?/)) {
            // it's an edge
            var edge = {
                src: st[0].ident,
                dst: st[2].ident,
                style: (st[3] && st[3].style || {})
            }
            edge.style.directed = st[1].directed
            if (nodes[edge.src] === undefined) nodes[edge.src] = ($.isEmptyObject(nodestyle)) ? -2600 : objcopy(nodestyle)
            if (nodes[edge.dst] === undefined) nodes[edge.dst] = ($.isEmptyObject(nodestyle)) ? -2600 : objcopy(nodestyle)
            edges[edge.src] = edges[edge.src] || {}
            edges[edge.src][edge.dst] = objmerge(edgestyle, edge.style)
        } else if (types.match(/ident-arrow|ident(-style)?/)) {
            // it's a node declaration (or an edge typo but we can still salvage a node name)
            var node = st[0].ident
            if (st[1] && st[1].style) {
                nodes[node] = objmerge(nodestyle, st[1].style)
            } else {
                nodes[node] = ($.isEmptyObject(nodestyle)) ? -2600 : objcopy(nodestyle) // use defaults
            }

        } else if (types == 'style') {
            // it's a global style declaration for nodes
            nodestyle = objmerge(nodestyle, st[0].style)
        } else if (types == 'arrow-style') {
            // it's a global style declaration for edges
            edgestyle = objmerge(edgestyle, st[1].style)
        }
    })

    // find any nodes that were brought in via an edge then never styled explicitly.
    // they get whatever the final nodestyle was built up to be
    $.each(nodes, function(name, data) {
        if (data === -2600) {
            nodes[name] = objcopy(nodestyle)
        }
    })

    return {
        nodes: nodes,
        edges: edges
    }
}

function lechs(s) {
    var tokens = []

    var buf = '',
        inObj = false,
        objBeg = -1,
        objEnd = -1;

    var flush = function() {
        var bufstr = strip(buf)
        if (bufstr.length > 0) tokens.push({
            type: "ident",
            ident: bufstr
        })
        buf = ""
    }

    s = s.replace(/([ \t]*)?;.*$/, '') // screen out comments

    for (var i = 0, j = s.length;;) {
        var c = s[i]
        if (c === undefined) break
        if (c == '-') {
            if (s[i + 1] == '>' || s[i + 1] == '-') {
                flush()
                var edge = s.substr(i, 2)
                tokens.push({
                    type: "arrow",
                    directed: (edge == '->')
                })
                i += 2
            } else {
                buf += c
                i++
            }
        } else if (c == '{') {
            var objStr = recognize(s.substr(i))
            if (objStr.length == 0) {
                buf += c
                i++
            } else {
                var style = unpack(objStr)
                if (!$.isEmptyObject(style)) {
                    flush()
                    tokens.push({
                        type: "style",
                        style: style
                    })
                }
                i += objStr.length
            }
        } else {
            buf += c
            i++
        }
        if (i >= j) {
            flush()
            break
        }
    }

    return tokens
}

function strip(s) {
     return s.replace(/^[\s\t]+|[\s\t]+$/g,'');
}

function recognize(s) {
    // return the first {.*} mapping in the string (or "" if none)
    var from = -1,
        to = -1,
        depth = 0;
    $.each(s, function(i, c) {
        switch (c) {
            case '{':
                if (depth == 0 && from == -1) from = i
                depth++
                break
            case '}':
                depth--
                if (depth == 0 && to == -1) to = i + 1
                break
        }
    })
    return s.substring(from, to)
}

function unpack(os) {
    // process {key1:val1, key2:val2, ...} in a recognized mapping str
    if (!os) return {}

    var pairs = os.substring(1, os.length - 1).split(/\s*,\s*/)
    var kv_data = {}

    $.each(pairs, function(i, pair) {
            var kv = pair.split(':')
            if (kv[0] === undefined || kv[1] === undefined) return
            var key = strip(kv[0])
            var val = strip(kv.slice(1).join(":")) // put back any colons that are part of the value
            if (!isNaN(val)) val = parseFloat(val)
            if (val == 'true' || val == 'false') val = (val == 'true')
            kv_data[key] = val
        })
        // trace(os,kv_data)
    return kv_data
}

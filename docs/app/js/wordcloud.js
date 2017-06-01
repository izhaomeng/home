var words = [
  {size:100, text:"hello"},
  {size:260, text:"赵"},
  {size:100, text:"猛"},
  {size:200, text:"luo"},
  {size:109, text:"码"},
  {size:50, text:"西"},
  {size:30, text:"a"}
];


G2.Shape.registShape('point', 'cloud', {
        drawShape: function(cfg, container) {
          cfg.points = this.parsePoints(cfg.points);
          var textAttrs = G2.Util.mix(true, {}, {
                                                fillOpacity: cfg.opacity,
                                                fontSize: cfg.size,
                                                rotate: cfg.origin._origin.rotate,
                                                text: cfg.origin._origin.text,
                                                textAlign: 'center',
                                                fill: cfg.color,
                                                textBaseline:'Alphabetic'
                                              }, cfg.style);
          var textPositionAttrs =  G2.Util.mix(textAttrs, {
            x: cfg.points[0].x,
            y: cfg.points[0].y
          });
          var shape = container.addShape('text',{ attrs: textPositionAttrs });
          return shape;
        }
      });

var layout = new Cloud({
      words: words,
      text: function(word){
        return word.text;
      },
      size: function(word){
        return word.size;
      }
    });

layout.exec(function(texts){
                var chart = new G2.Chart({
                  id: 'cloud1',
                  forceFit: true,
                  width : 500,
                  height : 500,
                  animate: true
                });

                var view = chart.createView();
                view.source(texts);
                view.tooltip({title:false});
                view.axis(false);
                view.coord().reflect();
                view.point().position("x*y").shape("cloud").size("size",function(size){
                  return size;
                }).color("text").tooltip("size");
                view.render();
});

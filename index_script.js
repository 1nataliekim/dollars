$("input[name='salary']").on({
    keyup: function() {
      formatCurrency($(this));
    }
});


function formatNumber(n) {
  return n.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}


function formatCurrency(input) {
  // appends $ to value, validates decimal side
  // and puts cursor back in right position.

  // get input value
  var input_val = input.val();

  // don't validate empty input
  if (input_val == "") { return; }

  // original length
  var original_len = input_val.length;

  // initial caret position
  var caret_pos = input.prop("selectionStart");

  // format
  input_val = formatNumber(input_val);
  input_val = "$" + input_val;

  // send updated string to input
  input.val(input_val);

  // put caret back in the right position
  var updated_len = input_val.length;
  caret_pos = updated_len - original_len + caret_pos;
  input[0].setSelectionRange(caret_pos, caret_pos);
}

document.getElementById("btn_go").onclick = function() {go()};

function go() {
  makePie();
}

function makePie() {
  const width = window.innerWidth,
    height = window.innerHeight,
    maxRadius = (Math.min(width, height) / 2) - 5;

  const formatNumber2 = d3.format(',d');

  const x = d3.scaleLinear()
      .range([0, 2 * Math.PI])
      .clamp(true);

  const y = d3.scaleSqrt()
      .range([maxRadius*.1, maxRadius]);

  const color = d3.scaleOrdinal(d3.schemeCategory20);

  const partition = d3.partition();

  const arc = d3.arc()
      .startAngle(d => x(d.x0))
      .endAngle(d => x(d.x1))
      .innerRadius(d => Math.max(0, y(d.y0)))
      .outerRadius(d => Math.max(0, y(d.y1)));

  const middleArcLine = d => {
      const halfPi = Math.PI/2;
      const angles = [x(d.x0) - halfPi, x(d.x1) - halfPi];
      const r = Math.max(0, (y(d.y0) + y(d.y1)) / 2);

      const middleAngle = (angles[1] + angles[0]) / 2;
      const invertDirection = middleAngle > 0 && middleAngle < Math.PI; // On lower quadrants write text ccw
      if (invertDirection) { angles.reverse(); }

      const path = d3.path();
      path.arc(0, 0, r, angles[0], angles[1], invertDirection);
      return path.toString();
  };

  const textFits = d => {
      const CHAR_SPACE = 6;

      const deltaAngle = x(d.x1) - x(d.x0);
      const r = Math.max(0, (y(d.y0) + y(d.y1)) / 2);
      const perimeter = r * deltaAngle;

      return d.data.name.length * CHAR_SPACE < perimeter;
  };

  const svg = d3.select('body').append('svg')
      .style('width', '100vw')
      .style('height', '100vh')
      .attr('viewBox', `${-width / 2} ${-height / 2} ${width} ${height}`)
      .on('click', () => focusOn()); // Reset zoom on canvas click

  d3.json('https://gist.githubusercontent.com/mbostock/4348373/raw/85f18ac90409caa5529b32156aa6e71cf985263f/flare.json', (error, root) => {
      if (error) throw error;

      root = d3.hierarchy(root);
      root.sum(d => d.size);

      const slice = svg.selectAll('g.slice')
          .data(partition(root).descendants());

      slice.exit().remove();

      const newSlice = slice.enter()
          .append('g').attr('class', 'slice')
          .on('click', d => {
              d3.event.stopPropagation();
              focusOn(d);
          });

      newSlice.append('title')
          .text(d => d.data.name + '\n' + formatNumber2(d.value));

      newSlice.append('path')
          .attr('class', 'main-arc')
          .style('fill', d => color((d.children ? d : d.parent).data.name))
          .attr('d', arc);

      newSlice.append('path')
          .attr('class', 'hidden-arc')
          .attr('id', (_, i) => `hiddenArc${i}`)
          .attr('d', middleArcLine);

      const text = newSlice.append('text')
          .attr('display', d => textFits(d) ? null : 'none');

      // Add white contour
      text.append('textPath')
          .attr('startOffset','50%')
          .attr('xlink:href', (_, i) => `#hiddenArc${i}` )
          .text(d => d.data.name)
          .style('fill', 'none')
          .style('stroke', '#fff')
          .style('stroke-width', 5)
          .style('stroke-linejoin', 'round');

      text.append('textPath')
          .attr('startOffset','50%')
          .attr('xlink:href', (_, i) => `#hiddenArc${i}` )
          .text(d => d.data.name);
  });

  function focusOn(d = { x0: 0, x1: 1, y0: 0, y1: 1 }) {
      // Reset to top-level if no data point specified

      const transition = svg.transition()
          .duration(750)
          .tween('scale', () => {
              const xd = d3.interpolate(x.domain(), [d.x0, d.x1]),
                  yd = d3.interpolate(y.domain(), [d.y0, 1]);
              return t => { x.domain(xd(t)); y.domain(yd(t)); };
          });

      transition.selectAll('path.main-arc')
          .attrTween('d', d => () => arc(d));

      transition.selectAll('path.hidden-arc')
          .attrTween('d', d => () => middleArcLine(d));

      transition.selectAll('text')
          .attrTween('display', d => () => textFits(d) ? null : 'none');

      moveStackToFront(d);

      //

      function moveStackToFront(elD) {
          svg.selectAll('.slice').filter(d => d === elD)
              .each(function(d) {
                  this.parentNode.appendChild(this);
                  if (d.parent) { moveStackToFront(d.parent); }
              })
      }
  }
}

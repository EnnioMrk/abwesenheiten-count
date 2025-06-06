function ChartistPluginTooltip(t, e) {
    const o = {
            tooltipOffset: { x: 0, y: -20 },
            anchorToPoint: !1,
            appendToBody: !0,
            class: void 0,
            pointClass: 'ct-point',
            tooltipFnc: void 0,
            transformTooltipTextFnc: void 0,
            metaIsHTML: !1,
        },
        s = Chartist.extend({}, o, e);
    let a = s.pointClass;
    e?.pointClass ||
        (t instanceof BarChart
            ? (a = 'ct-bar')
            : t instanceof PieChart &&
              (a = t.options.donut ? 'ct-slice-donut' : 'ct-slice-pie'));
    const i = t.container;
    let n,
        l = !1,
        r = i.offsetParent || i;
    {
        let t;
        (t = s.appendToBody
            ? document.querySelector('.chartist-tooltip')
            : i.querySelector('.chartist-tooltip')),
            t ||
                ((t = document.createElement('div')),
                t.classList.add('chartist-tooltip'),
                s.class &&
                    (Array.isArray(s.class)
                        ? s.class.forEach((e) => t?.classList.add(e))
                        : t.classList.add(s.class)),
                s.appendToBody
                    ? document.body.appendChild(t)
                    : i.appendChild(t)),
            (n = t);
    }
    let c = n.offsetHeight,
        p = n.offsetWidth;
    function f(t) {
        (c = c || n.offsetHeight), (p = p || n.offsetWidth);
        const e = -p / 2 + s.tooltipOffset.x,
            o = -c + s.tooltipOffset.y,
            a = s.anchorToPoint && t.target && t.target.x2 && t.target.y2;
        if (s.appendToBody)
            if (a) {
                const s = i.getBoundingClientRect(),
                    a = t.target.x2.baseVal.value + s.left + window.scrollX,
                    l = t.target.y2.baseVal.value + s.top + window.scrollY;
                (n.style.left = a + e + 'px'), (n.style.top = l + o + 'px');
            } else
                (n.style.left = t.pageX + e + 'px'),
                    (n.style.top = t.pageY + o + 'px');
        else {
            const s = r.getBoundingClientRect(),
                l = -s.left - window.scrollX + e,
                c = -s.top - window.scrollY + o;
            if (a) {
                const e = i.getBoundingClientRect(),
                    o = t.target.x2.baseVal.value + e.left + window.scrollX,
                    s = t.target.y2.baseVal.value + e.top + window.scrollY;
                (n.style.left = o + l + 'px'), (n.style.top = s + c + 'px');
            } else
                (n.style.left = t.pageX + l + 'px'),
                    (n.style.top = t.pageY + c + 'px');
        }
    }
    function d(t) {
        (l = !1), t.classList.remove('tooltip-show');
    }
    d(n),
        i.addEventListener('mouseover', (e) => {
            if (!e.target.classList.contains(a)) return;
            const o = e.target;
            let d = '',
                u = '';
            t instanceof Chartist.PieChart &&
                (u =
                    o.parentNode.getAttribute('ct:meta') ||
                    o.parentNode.getAttribute('ct:series-name') ||
                    '');
            let h = o.getAttribute('ct:meta') || u || '';
            const g = !!h;
            let y = o.getAttribute('ct:value') || '';
            if (
                (s.transformTooltipTextFnc &&
                    'function' == typeof s.transformTooltipTextFnc &&
                    (y = s.transformTooltipTextFnc(y)),
                s.tooltipFnc && 'function' == typeof s.tooltipFnc)
            )
                d = s.tooltipFnc(h, y);
            else {
                if (s.metaIsHTML) {
                    const t = document.createElement('textarea');
                    (t.innerHTML = h), (h = t.value);
                }
                if (
                    ((h =
                        '<span class="chartist-tooltip-meta">' + h + '</span>'),
                    g)
                )
                    d += h + '<br>';
                else if (t instanceof Chartist.PieChart) {
                    const t = (function (t, e) {
                        let o = t;
                        do {
                            o = t.nextSibling;
                        } while (o && !o.classList.contains(e));
                        return o;
                    })(o, 'ct-label');
                    t &&
                        (d +=
                            ((m = t).innerText || m.textContent || '') +
                            '<br>');
                }
                y &&
                    ((y =
                        '<span class="chartist-tooltip-value">' +
                        y +
                        '</span>'),
                    (d += y));
            }
            var m;
            n &&
                d &&
                ((n.innerHTML = d),
                (c = n.offsetHeight),
                (p = n.offsetWidth),
                s.appendToBody || (r = i.offsetParent || i),
                'absolute' !== n.style.display &&
                    (n.style.display = 'absolute'),
                f(e),
                (function (t) {
                    (l = !0), t.classList.add('tooltip-show');
                })(n),
                (c = n.offsetHeight),
                (p = n.offsetWidth));
        }),
        i.addEventListener('mouseout', (t) => {
            t.target.classList.contains(a) && n && d(n);
        }),
        i.addEventListener('mousemove', (t) => {
            !s.anchorToPoint && l && f(t);
        });
}

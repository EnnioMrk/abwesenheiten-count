const ctx = document.getElementById("sevenDaysChart")?.getContext("2d");
const data = analyser.getRecentSubjectAbsences(7);
new Chart(ctx, {
  type: "bar",
  data: {
    labels: Object.keys(data),
    datasets: [
      {
        label: "sevenDaysChart",
        data: Object.values(data),
        backgroundColor: "rgba(99, 102, 241, 0.5)",
        borderColor: "rgb(99, 102, 241)",
        borderWidth: 1,
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 20,
        bottom: 10,
      },
    },
    plugins: {
      legend: {
        position: "bottom",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (label, index, labels) {
            if (Math.floor(label) === label) {
              return label;
            }
          },
        },
      },
      x: {
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const subject = Object.keys(data)[index];
        updateMonthlyTrends(subject);
      }
    },
  },
});

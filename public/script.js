$(document).ready(function(){
	$mainTable = $('#dtBooks');
	$mainTable.bootstrapTable('destroy').bootstrapTable({
		url:'data.json?key='+KEY,
		pagination: true,
		search: true,
		pageSize: 50,
		detailView: true,
		rowStyle: rowStyle,
		detailFormatter: detailFormatter,
		columns: getColumns('main'),
        onAll: onAll
	});
	$likedTable = $('#dtLikedBooks');
	$likedTable.bootstrapTable('destroy').bootstrapTable({
		url:'data_liked.json?key='+KEY,
		pagination: true,
		search: true,
		pageSize: 50,
		detailView: true,
		rowStyle: rowStyle,
		detailFormatter: detailFormatter,
		columns: getColumns('liked'),
        onAll: onAll
	});
	$removedTable = $('#dtRemovedBooks');
	$removedTable.bootstrapTable('destroy').bootstrapTable({
		url:'data_removed.json?key='+KEY,
		pagination: true,
		search: true,
		pageSize: 50,
		detailView: true,
		rowStyle: rowStyle,
		detailFormatter: detailFormatter,
		columns: getColumns('removed'),
        onAll: onAll
	});

	$('#orderedModal').on('show.bs.modal', function (e) {
		let data = $likedTable.bootstrapTable('getData', false).filter(function(row){
			return row.chosen;
		});
		let m = '<h6>You are ordering '+data.length+' book'+(data.length == 1 ? '':'s')+'</h6><table class="table">';
		for(let i in data){
			m += '<tr><td>'+data[i].ids.join(', ') +'</td><td> '+data[i].author+' </td><td> '+data[i].title+' </td><td> '+data[i].places.join(', ')+'</td></tr>'
		}
		m += '</table>';
		$('#orderedModalBody').html(m);
		//$(this).modal('show');
	});
});

function detailFormatter(index, row){
	var html = ''
   	html += '<div class="container">'
   	html += '<div class="row">'
   	html += '<div class="col-sm"><b>ID:</b></div><div class="col-sm">'+row.ids.join(', ')+'</div>'
   	html += '<div class="col-sm"><b>Publisher:</b></div><div class="col-sm">'+row.publ+'</div>'
   	html += '</div>'
   	html += '<div class="row">'
   	html += '<div class="col-sm"><b>Places:</b></div><div class="col-sm">'+row.places.join(', ')+'</div>'
    html += '<div class="col-sm"><b>Count:</b></div><div class="col-sm">'+row.ids.length+'</div>'
    html += '</div>'
    html += '</div>';
    return html;
}

function operateFormatter(value, row, index) {
	return [
		'<a class="like mr-4" href="javascript:void(0)" title="Like">',
		'<i class="fas fa-heart fa-2x"></i>',
		'</a>',
		'<a class="remove" href="javascript:void(0)" title="Remove">',
		'<i class="fas fa-trash fa-2x"></i>',
		'</a>'
	].join('')
}

function operateRemovedFormatter(value, row, index) {
	return [
		'<a class="like mr-4" href="javascript:void(0)" title="Like">',
		'<i class="fas fa-heart fa-2x"></i>',
		'</a>',
		'<a class="unremove" href="javascript:void(0)" title="Unremove">',
		'<i class="fas fa-reply fa-2x"></i>',
		'</a>'
	].join('')
}

function operateLikedFormatter(value, row, index) {
	return [
		'<a class="like mr-4" href="javascript:void(0)" title="Like">',
		'<i class="fas fa-heart fa-2x"></i>',
		'</a>',
		'<a class="choose" href="javascript:void(0)" title="Check">',
		'<i class="fas fa-check-circle fa-2x"></i>',
		'</a>'
	].join('')
}
	
function rowStyle(row, index){
	if(row.chosen) return {
		classes: 'table-danger'
	}
	if(row.heart) return {
		classes: 'table-info'
	}
	else return {classes:''}
}

function onAll(){
	$('.page-list').hide();
	$('.float-right.search').css('width', '100%');
}

window.operateEvents = {
    'click .like': function (e, value, row, index) {
    	row.heart = !row.heart;
    	$.get({
			url: './action',
			data: {
				key: KEY,
				a: 'like',
				book: row.key,
				s: row.heart
			}
		});
		$mainTable.bootstrapTable('updateRow', {
			index: index,
			row: row
		})
		$likedTable.bootstrapTable('updateRow', {
			index: index,
			row: row
		})
	},
	'click .remove': function (e, value, row, index) {
		$.get({
			url: './action',
			data: {
				key: KEY,
				a: 'delete',
				book: row.key,
				s: 0
			}
		});
		$mainTable.bootstrapTable('remove', {
			field: 'key',
			values: [row.key]
		})
		$likedTable.bootstrapTable('remove', {
			field: 'key',
			values: [row.key]
		})
	},
	'click .unremove': function (e, value, row, index) {
		$.get({
			url: './action',
			data: {
				key: KEY,
				a: 'delete',
				book: row.key,
				s: 1
			}
		});
		$removedTable.bootstrapTable('remove', {
			field: 'key',
			values: [row.key]
		})
	},
	'click .choose': function (e, value, row, index) {
    	row.chosen = row.chosen ? 0 : 1;
    	row.heart = !row.chosen;
		$likedTable.bootstrapTable('updateRow', {
			index: index,
			row: row
		});
	}
}

function getColumns(t){
	return [{
			field: 'title',
			title: 'Title',
			width: '40%',
			sortable: true
		},
		{
			field: 'author',
			title: 'Author',
			width: '35%',
			sortable: true
		},
		{
			field: 'year',
			title: 'Year',
			sortable: true
		},
		{
			field: 'operate',
			align: 'center',
			events: window.operateEvents,
			formatter: {
				main: operateFormatter,
				liked: operateLikedFormatter,
				removed: operateRemovedFormatter
			}[t]
        }]
}
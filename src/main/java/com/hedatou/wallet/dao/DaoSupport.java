package com.hedatou.wallet.dao;

import java.lang.reflect.ParameterizedType;
import java.lang.reflect.Type;
import java.util.List;
import java.util.Map;

import org.hibernate.Hibernate;
import org.hibernate.Query;
import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.springframework.beans.factory.annotation.Autowired;

import com.hedatou.wallet.util.PagingParams;

@SuppressWarnings("unchecked")
public abstract class DaoSupport<T> {

	private Class<T> domain;

	protected DaoSupport() {
		Type genericType = getClass().getGenericSuperclass();
		if (genericType instanceof ParameterizedType) {
			domain = (Class<T>) ((ParameterizedType) genericType)
					.getActualTypeArguments()[0];
		}
	}

	@Autowired
	private SessionFactory sessionFactory;
	@Autowired
	protected PagingParams pagingParams;

	protected Session session() {
		return sessionFactory.getCurrentSession();
	}

	protected <X> X unique(String hql, Class<X> target) {
		return (X) session().createQuery(hql).uniqueResult();
	}

	protected <X> X unique(String hql, String name, Object value,
			Class<X> target) {
		return (X) session().createQuery(hql).setParameter(name, value)
				.uniqueResult();
	}

	protected <X> X unique(String hql, Map<String, Object> params,
			Class<X> target) {
		return (X) session().createQuery(hql).setProperties(params)
				.uniqueResult();
	}

	protected T unique(String hql) {
		return unique(hql, domain);
	}

	protected T unique(String hql, String name, Object value) {
		return unique(hql, name, value, domain);
	}

	protected T unique(String hql, Map<String, Object> params) {
		return unique(hql, params, domain);
	}

	private String count(String hql) {
		if (hql.startsWith("from")) {
			hql = "select count(*) " + hql;
		} else if (hql.startsWith("select")) {
			hql = hql.replaceFirst("(?<=select )", "count(").replaceFirst(
					"(?= from)", ")");
		}
		int pos = hql.indexOf(" order by");
		if (pos != -1)
			hql = hql.substring(0, pos);
		return hql;
	}

	protected <X> List<X> query(String hql, boolean paging, Class<X> target) {
		Query query = session().createQuery(hql);
		if (paging) {
			pagingParams.setTotal(unique(count(hql), Long.class));
			query.setFirstResult(pagingParams.getStart()).setMaxResults(
					pagingParams.getLimit());
		}
		return query.list();
	}

	protected <X> List<X> query(String hql, String name, Object value,
			boolean paging, Class<X> target) {
		Query query = session().createQuery(hql).setParameter(name, value);
		if (paging) {
			pagingParams.setTotal(unique(count(hql), name, value, Long.class));
			query.setFirstResult(pagingParams.getStart()).setMaxResults(
					pagingParams.getLimit());
		}
		return query.list();
	}

	protected <X> List<X> query(String hql, Map<String, Object> params,
			boolean paging, Class<X> target) {
		Query query = session().createQuery(hql).setProperties(params);
		if (paging) {
			pagingParams.setTotal(unique(count(hql), params, Long.class));
			query.setFirstResult(pagingParams.getStart()).setMaxResults(
					pagingParams.getLimit());
		}
		return query.list();
	}

	protected List<T> query(String hql, boolean paging) {
		return query(hql, paging, domain);
	}

	protected List<T> query(String hql, String name, Object value,
			boolean paging) {
		return query(hql, name, value, paging, domain);
	}

	protected List<T> query(String hql, Map<String, Object> params,
			boolean paging) {
		return query(hql, params, paging, domain);
	}

	protected void execute(String hql) {
		session().createQuery(hql).executeUpdate();
	}

	protected void execute(String hql, String name, Object value) {
		session().createQuery(hql).setParameter(name, value).executeUpdate();
	}

	protected void execute(String hql, Map<String, Object> params) {
		session().createQuery(hql).setProperties(params).executeUpdate();
	}

	// ----------
	// 公共方法
	// ----------

	public T load(long id) {
		return (T) session().load(domain, id);
	}

	public void save(T domain) {
		session().saveOrUpdate(domain);
	}

	public void delete(T domain) {
		session().delete(domain);
	}

	public void delete(long id) {
		delete(load(id));
	}

	public void init(Object proxy) {
		Hibernate.initialize(proxy);
	}

}